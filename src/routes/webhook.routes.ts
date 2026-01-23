import { Router, Request, Response } from "express";
import { paymentController } from "../controllers/payment.controller";

const router = Router();

// Webhook Stripe - pas d'authentification, vérifié par signature
// Note: Le body doit être en raw (Buffer) pour la vérification de signature
router.post("/stripe", (req: Request, res: Response) => paymentController.handleWebhook(req, res));

export default router;
