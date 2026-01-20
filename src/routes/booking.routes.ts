import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
} from "../controllers/booking.controller";

const router = Router();

// Toutes les routes de réservation nécessitent une authentification
router.use(requireAuth);

// POST /api/bookings - Créer une réservation
router.post("/", createBooking);

// GET /api/bookings/my-bookings - Mes réservations
router.get("/my-bookings", getMyBookings);

// GET /api/bookings/:id - Détail d'une réservation
router.get("/:id", getBookingById);

// PUT /api/bookings/:id - Modifier une réservation
router.put("/:id", updateBooking);

// DELETE /api/bookings/:id - Annuler une réservation
router.delete("/:id", cancelBooking);

export default router;
