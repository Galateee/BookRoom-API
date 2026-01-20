import { Router } from "express";
import { getRooms, getRoomById } from "../controllers/room.controller";

const router = Router();

// GET /api/rooms - Liste des salles
router.get("/", getRooms);

// GET /api/rooms/:id - Détail d'une salle
router.get("/:id", getRoomById);

export default router;
