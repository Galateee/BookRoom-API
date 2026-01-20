import { Router } from "express";
import { requireAdmin } from "../middlewares/auth.middleware";
import {
  createRoom,
  updateRoom,
  deleteRoom,
  getAllBookings,
  getStatistics,
} from "../controllers/admin.controller";

const router = Router();

// Routes pour la gestion des salles
router.post("/rooms", requireAdmin, createRoom);
router.put("/rooms/:id", requireAdmin, updateRoom);
router.delete("/rooms/:id", requireAdmin, deleteRoom);

// Routes pour la gestion des réservations
router.get("/bookings", requireAdmin, getAllBookings);

// Routes pour les statistiques
router.get("/statistics", requireAdmin, getStatistics);

export default router;
