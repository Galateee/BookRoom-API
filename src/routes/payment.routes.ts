import { Router } from "express";
import { paymentController } from "../controllers/payment.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/create-checkout", requireAuth, (req, res) =>
  paymentController.createCheckout(req, res)
);

router.get("/verify/:sessionId", (req, res) => paymentController.verifyPayment(req, res));

router.post("/refund", requireAuth, (req, res) => paymentController.requestRefund(req, res));

router.post("/calculate-refund", requireAuth, (req, res) =>
  paymentController.calculateRefund(req, res)
);

export default router;
