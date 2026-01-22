import { Router } from "express";
import { requireAdmin } from "../middlewares/auth.middleware";
import {
  getAllRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  toggleRoomStatus,
  getAllBookings,
  updateBookingStatus,
  getStatistics,
} from "../controllers/admin.controller";

const router = Router();

// Routes pour la gestion des salles
router.get("/rooms", requireAdmin, getAllRooms);
router.post("/rooms", requireAdmin, createRoom);
router.put("/rooms/:id", requireAdmin, updateRoom);
router.patch("/rooms/:id/toggle", requireAdmin, toggleRoomStatus);
router.delete("/rooms/:id", requireAdmin, deleteRoom);

// Routes pour la gestion des réservations
router.get("/bookings", requireAdmin, getAllBookings);
router.patch("/bookings/:id/status", requireAdmin, updateBookingStatus);

// Routes pour les statistiques
router.get("/statistics", requireAdmin, getStatistics);

export default router;
