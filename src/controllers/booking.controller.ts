import { Response } from "express";
import prisma from "../config/database";
import { AuthRequest } from "../middlewares/auth.middleware";

/**
 * POST /api/bookings
 * Créer une nouvelle réservation
 */
export async function createBooking(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const {
      roomId,
      date,
      startTime,
      endTime,
      customerName,
      customerEmail,
      customerPhone,
      numberOfPeople,
    } = req.body;

    // Validation des champs requis
    if (!roomId || !date || !startTime || !endTime || !customerName || !customerEmail) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Champs requis manquants",
          details: {
            required: "roomId, date, startTime, endTime, customerName, customerEmail",
          },
        },
      });
      return;
    }

    // Validation du format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Format d'email invalide",
        },
      });
      return;
    }

    // Validation du format des heures (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Format d'heure invalide (attendu: HH:MM)",
        },
      });
      return;
    }

    // Vérifier que l'heure de fin est après l'heure de début
    if (startTime >= endTime) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "L'heure de fin doit être après l'heure de début",
        },
      });
      return;
    }

    // Vérifier que la salle existe et est active
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room || !room.isActive) {
      res.status(404).json({
        success: false,
        error: {
          code: "ROOM_NOT_FOUND",
          message: "La salle demandée n'existe pas ou n'est pas disponible",
        },
      });
      return;
    }

    // Vérifier les conflits de créneaux
    const conflict = await prisma.booking.findFirst({
      where: {
        roomId,
        date,
        status: {
          in: [
            "PENDING_PAYMENT",
            "PAYMENT_RECEIVED",
            "CONFIRMED",
            "MODIFIED",
            "CHECKED_IN",
            "IN_PROGRESS",
          ],
        },
        OR: [
          // Le nouveau créneau commence pendant une réservation existante
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          // Le nouveau créneau se termine pendant une réservation existante
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          // Le nouveau créneau englobe une réservation existante
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
    });

    if (conflict) {
      res.status(409).json({
        success: false,
        error: {
          code: "TIME_CONFLICT",
          message: "Ce créneau est déjà réservé",
        },
      });
      return;
    }

    // Calculer le prix total
    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = parseInt(endTime.split(":")[0]);
    const hours = endHour - startHour;
    const totalPrice = hours * room.pricePerHour;

    // Créer la réservation
    const booking = await prisma.booking.create({
      data: {
        roomId,
        userId,
        date,
        startTime,
        endTime,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        numberOfPeople: numberOfPeople || 1,
        totalPrice,
        status: "PENDING_PAYMENT",
      },
      include: {
        room: { select: { name: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        bookingId: booking.id,
        roomName: booking.room.name,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        totalPrice: booking.totalPrice,
        status: booking.status.toLowerCase(),
      },
      message: "Réservation créée avec succès",
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Erreur lors de la création de la réservation",
      },
    });
  }
}

/**
 * GET /api/bookings/me
 * Récupérer toutes les réservations de l'utilisateur connecté
 */
export async function getMyBookings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        room: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedBookings = bookings.map((b: (typeof bookings)[0]) => ({
      bookingId: b.id,
      roomName: b.room.name,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      totalPrice: b.totalPrice,
      status: b.status.toLowerCase(),
      createdAt: b.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      data: formattedBookings,
      meta: { total: formattedBookings.length },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Erreur lors de la récupération des réservations",
      },
    });
  }
}

/**
 * GET /api/bookings/:id
 * Récupérer le détail d'une réservation
 */
export async function getBookingById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    const booking = await prisma.booking.findFirst({
      where: { id, userId },
    });

    if (!booking) {
      res.status(404).json({
        success: false,
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Réservation non trouvée",
        },
      });
      return;
    }

    // Récupérer le nom de la salle séparément
    const room = await prisma.room.findUnique({
      where: { id: booking.roomId },
      select: { name: true },
    });

    res.json({
      success: true,
      data: {
        bookingId: booking.id,
        roomId: booking.roomId,
        roomName: room?.name || "Salle inconnue",
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        numberOfPeople: booking.numberOfPeople,
        totalPrice: booking.totalPrice,
        status: booking.status.toLowerCase(),
        createdAt: booking.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Erreur lors de la récupération de la réservation",
      },
    });
  }
}

/**
 * PUT /api/bookings/:id
 * Modifier une réservation existante
 */
export async function updateBooking(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;
    const { date, startTime, endTime, numberOfPeople } = req.body;

    // Vérifier que la réservation existe et appartient à l'utilisateur
    const existingBooking = await prisma.booking.findFirst({
      where: { id, userId },
    });

    if (!existingBooking) {
      res.status(404).json({
        success: false,
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Réservation non trouvée",
        },
      });
      return;
    }

    // Récupérer la salle
    const room = await prisma.room.findUnique({
      where: { id: existingBooking.roomId },
    });

    if (!room) {
      res.status(404).json({
        success: false,
        error: {
          code: "ROOM_NOT_FOUND",
          message: "Salle non trouvée",
        },
      });
      return;
    }

    // Vérifier que la réservation peut être modifiée
    const cancelledStatuses = ["CANCELLED_BY_USER", "CANCELLED_BY_ADMIN", "CANCELLED_NO_PAYMENT"];
    if (
      cancelledStatuses.includes(existingBooking.status) ||
      existingBooking.status === "COMPLETED"
    ) {
      res.status(400).json({
        success: false,
        error: {
          code: "BOOKING_NOT_MODIFIABLE",
          message: "Cette réservation ne peut plus être modifiée",
        },
      });
      return;
    }

    // Vérifier les conflits si le créneau change
    if (date || startTime || endTime) {
      const newDate = date || existingBooking.date;
      const newStartTime = startTime || existingBooking.startTime;
      const newEndTime = endTime || existingBooking.endTime;

      const conflict = await prisma.booking.findFirst({
        where: {
          roomId: existingBooking.roomId,
          date: newDate,
          id: { not: id },
          status: {
            in: [
              "PENDING_PAYMENT",
              "PAYMENT_RECEIVED",
              "CONFIRMED",
              "MODIFIED",
              "CHECKED_IN",
              "IN_PROGRESS",
            ],
          },
          OR: [
            { startTime: { lte: newStartTime }, endTime: { gt: newStartTime } },
            { startTime: { lt: newEndTime }, endTime: { gte: newEndTime } },
            { startTime: { gte: newStartTime }, endTime: { lte: newEndTime } },
          ],
        },
      });

      if (conflict) {
        res.status(409).json({
          success: false,
          error: {
            code: "TIME_CONFLICT",
            message: "Ce créneau est déjà réservé",
          },
        });
        return;
      }
    }

    // Calculer le nouveau prix si nécessaire
    const finalStartTime = startTime || existingBooking.startTime;
    const finalEndTime = endTime || existingBooking.endTime;
    const startHour = parseInt(finalStartTime.split(":")[0]);
    const endHour = parseInt(finalEndTime.split(":")[0]);
    const hours = endHour - startHour;
    const totalPrice = hours * room.pricePerHour;

    // Mettre à jour la réservation
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        date: date || existingBooking.date,
        startTime: finalStartTime,
        endTime: finalEndTime,
        numberOfPeople: numberOfPeople || existingBooking.numberOfPeople,
        totalPrice,
        status: "MODIFIED",
      },
    });

    res.json({
      success: true,
      data: {
        bookingId: updatedBooking.id,
        roomName: room.name,
        date: updatedBooking.date,
        startTime: updatedBooking.startTime,
        endTime: updatedBooking.endTime,
        totalPrice: updatedBooking.totalPrice,
        status: updatedBooking.status.toLowerCase(),
      },
      message: "Réservation modifiée avec succès",
    });
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Erreur lors de la modification de la réservation",
      },
    });
  }
}

/**
 * DELETE /api/bookings/:id
 * Annuler une réservation
 */
export async function cancelBooking(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const id = req.params.id as string;

    // Vérifier que la réservation existe et appartient à l'utilisateur
    const booking = await prisma.booking.findFirst({
      where: { id, userId },
    });

    if (!booking) {
      res.status(404).json({
        success: false,
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Réservation non trouvée",
        },
      });
      return;
    }

    // Vérifier que la réservation peut être annulée
    const cancelledStatuses = ["CANCELLED_BY_USER", "CANCELLED_BY_ADMIN", "CANCELLED_NO_PAYMENT"];
    if (cancelledStatuses.includes(booking.status)) {
      res.status(400).json({
        success: false,
        error: {
          code: "BOOKING_ALREADY_CANCELLED",
          message: "Cette réservation est déjà annulée",
        },
      });
      return;
    }

    if (booking.status === "COMPLETED") {
      res.status(400).json({
        success: false,
        error: {
          code: "BOOKING_COMPLETED",
          message: "Une réservation terminée ne peut pas être annulée",
        },
      });
      return;
    }

    // Annuler la réservation
    await prisma.booking.update({
      where: { id },
      data: {
        status: "CANCELLED_BY_USER",
        cancelledAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Réservation annulée avec succès",
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Erreur lors de l'annulation de la réservation",
      },
    });
  }
}
