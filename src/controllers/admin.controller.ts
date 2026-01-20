import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../config/database";

/**
 * Créer une nouvelle salle
 */
export async function createRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, description, capacity, pricePerHour, equipments, imageUrl, images } = req.body;

    // Validation des données
    if (!name || !capacity || !pricePerHour) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Nom, capacité et prix par heure sont requis",
        },
      });
      return;
    }

    if (capacity < 1) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_CAPACITY",
          message: "La capacité doit être d'au moins 1 personne",
        },
      });
      return;
    }

    if (pricePerHour < 0) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PRICE",
          message: "Le prix doit être positif",
        },
      });
      return;
    }

    const room = await prisma.room.create({
      data: {
        name,
        description: description || "",
        capacity,
        pricePerHour,
        equipments: equipments || [],
        imageUrl: imageUrl || "",
        images: images || [],
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: room,
    });
  } catch (error) {
    console.error("Erreur lors de la création de la salle:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Erreur lors de la création de la salle",
      },
    });
  }
}

/**
 * Mettre à jour une salle existante
 */
export async function updateRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, description, capacity, pricePerHour, equipments, imageUrl, images, isActive } =
      req.body;

    // Vérifier que la salle existe
    const existingRoom = await prisma.room.findUnique({
      where: { id },
    });

    if (!existingRoom) {
      res.status(404).json({
        success: false,
        error: {
          code: "ROOM_NOT_FOUND",
          message: "Salle non trouvée",
        },
      });
      return;
    }

    // Validation des données si fournies
    if (capacity !== undefined && capacity < 1) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_CAPACITY",
          message: "La capacité doit être d'au moins 1 personne",
        },
      });
      return;
    }

    if (pricePerHour !== undefined && pricePerHour < 0) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PRICE",
          message: "Le prix doit être positif",
        },
      });
      return;
    }

    const room = await prisma.room.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(capacity !== undefined && { capacity }),
        ...(pricePerHour !== undefined && { pricePerHour }),
        ...(equipments !== undefined && { equipments }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(images !== undefined && { images }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la salle:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Erreur lors de la mise à jour de la salle",
      },
    });
  }
}

/**
 * Supprimer une salle (soft delete en désactivant)
 */
export async function deleteRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    // Vérifier que la salle existe
    const existingRoom = await prisma.room.findUnique({
      where: { id },
    });

    if (!existingRoom) {
      res.status(404).json({
        success: false,
        error: {
          code: "ROOM_NOT_FOUND",
          message: "Salle non trouvée",
        },
      });
      return;
    }

    // Vérifier s'il y a des réservations futures
    const futureBookings = await prisma.booking.count({
      where: {
        roomId: id,
        status: "CONFIRMED" as const,
        date: {
          gte: new Date().toISOString().split("T")[0],
        },
      },
    });

    if (futureBookings > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: "HAS_FUTURE_BOOKINGS",
          message: `Impossible de supprimer : ${futureBookings} réservation(s) future(s) existent pour cette salle`,
        },
      });
      return;
    }

    // Soft delete : désactiver la salle
    const room = await prisma.room.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: "Salle désactivée avec succès",
      data: room,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de la salle:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Erreur lors de la suppression de la salle",
      },
    });
  }
}

/**
 * Récupérer toutes les réservations (admin)
 */
export async function getAllBookings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status, roomId, startDate, endDate } = req.query;

    const bookings = await prisma.booking.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(roomId && { roomId: roomId as string }),
        ...(startDate &&
          endDate && {
            date: {
              gte: startDate as string,
              lte: endDate as string,
            },
          }),
      },
      include: {
        room: {
          select: {
            name: true,
            imageUrl: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
    });

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des réservations:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Erreur lors de la récupération des réservations",
      },
    });
  }
}

/**
 * Obtenir des statistiques globales
 */
export async function getStatistics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Nombre total de salles actives
    const totalRooms = await prisma.room.count({
      where: { isActive: true },
    });

    // Nombre total de réservations
    const totalBookings = await prisma.booking.count();

    // Réservations confirmées
    const confirmedBookings = await prisma.booking.count({
      where: { status: "CONFIRMED" },
    });

    // Réservations futures
    const futureBookings = await prisma.booking.count({
      where: {
        status: "CONFIRMED",
        date: { gte: today },
      },
    });

    // Revenu total
    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] as const },
      },
      select: { totalPrice: true },
    });
    const totalRevenue = bookings.reduce(
      (sum: number, b: { totalPrice: number }) => sum + b.totalPrice,
      0
    );

    // Salle la plus réservée
    const bookingsByRoom = await prisma.booking.groupBy({
      by: ["roomId"],
      _count: { id: true },
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      orderBy: { _count: { id: "desc" } },
      take: 1,
    });

    let mostBookedRoom = null;
    if (bookingsByRoom.length > 0) {
      const room = await prisma.room.findUnique({
        where: { id: bookingsByRoom[0].roomId },
        select: { id: true, name: true },
      });
      mostBookedRoom = {
        ...room,
        bookingCount: bookingsByRoom[0]._count.id,
      };
    }

    res.json({
      success: true,
      data: {
        totalRooms,
        totalBookings,
        confirmedBookings,
        futureBookings,
        totalRevenue,
        mostBookedRoom,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      },
    });
  }
}
