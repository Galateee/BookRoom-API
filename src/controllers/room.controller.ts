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
        description: true,
        capacity: true,
        pricePerHour: true,
        equipments: true,
        imageUrl: true,
        isActive: true,
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
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    const maxDateStr = maxDate.toISOString().split("T")[0];

    const bookingsFiltered = bookings.filter((b) => b.date <= maxDateStr);

    res.json({
      success: true,
      data: {
        ...room,
        bookedSlots: bookingsFiltered,
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
