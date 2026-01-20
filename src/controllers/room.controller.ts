import { Request, Response } from "express";
import prisma from "../config/database";

/**
 * GET /api/rooms
 * Récupère la liste de toutes les salles actives
 */
export async function getRooms(_req: Request, res: Response): Promise<void> {
  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        capacity: true,
        pricePerHour: true,
        equipments: true,
        imageUrl: true,
      },
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      data: rooms,
      meta: { total: rooms.length },
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Erreur lors de la récupération des salles",
      },
    });
  }
}

/**
 * GET /api/rooms/:id
 * Récupère le détail d'une salle avec ses disponibilités
 */
export async function getRoomById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ID",
          message: "ID de salle invalide",
        },
      });
      return;
    }

    // Récupérer la salle
    const room = await prisma.room.findUnique({
      where: { id },
    });

    if (!room) {
      res.status(404).json({
        success: false,
        error: {
          code: "ROOM_NOT_FOUND",
          message: "La salle demandée n'existe pas",
        },
      });
      return;
    }

    // Récupérer les réservations actives pour cette salle
    const bookings = await prisma.booking.findMany({
      where: {
        roomId: id,
        status: { in: ["CONFIRMED", "MODIFIED"] },
        date: { gte: new Date().toISOString().split("T")[0] },
      },
      select: {
        date: true,
        startTime: true,
        endTime: true,
      },
    });

    // Générer les créneaux disponibles pour les 7 prochains jours
    const availableSlots = generateAvailableSlots(bookings);

    res.json({
      success: true,
      data: {
        ...room,
        availableSlots,
      },
    });
  } catch (error) {
    console.error("Error fetching room:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Erreur lors de la récupération de la salle",
      },
    });
  }
}

interface BookedSlot {
  date: string;
  startTime: string;
  endTime: string;
}

interface AvailableSlot {
  date: string;
  slots: string[];
}

/**
 * Génère les créneaux disponibles pour les 7 prochains jours
 */
function generateAvailableSlots(bookedSlots: BookedSlot[]): AvailableSlot[] {
  const slots: AvailableSlot[] = [];
  const allHours = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    // Trouver les créneaux déjà réservés pour cette date
    const bookedForDate = bookedSlots.filter((b) => b.date === dateStr);
    const bookedHours = new Set<string>();

    bookedForDate.forEach((booking) => {
      const start = parseInt(booking.startTime.split(":")[0]);
      const end = parseInt(booking.endTime.split(":")[0]);
      for (let h = start; h < end; h++) {
        bookedHours.add(`${h.toString().padStart(2, "0")}:00`);
      }
    });

    // Créneaux disponibles = tous les créneaux - les réservés
    const available = allHours.filter((h) => !bookedHours.has(h));

    if (available.length > 0) {
      slots.push({ date: dateStr, slots: available });
    }
  }

  return slots;
}
