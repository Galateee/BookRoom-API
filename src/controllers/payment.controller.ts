import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { stripeService } from "../services/stripe.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import Stripe from "stripe";

const prisma = new PrismaClient();

export class PaymentController {
  /**
   * Créer une session de paiement Stripe Checkout
   * POST /api/payment/create-checkout
   */
  async createCheckout(req: AuthRequest, res: Response) {
    try {
      const { bookingData } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        });
      }

      // Récupérer les informations de la salle
      const room = await prisma.room.findUnique({
        where: { id: bookingData.roomId },
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          error: { code: "ROOM_NOT_FOUND", message: "Room not found" },
        });
      }

      // Créer la réservation avec statut PENDING_PAYMENT
      const booking = await prisma.booking.create({
        data: {
          roomId: bookingData.roomId,
          userId,
          date: bookingData.date,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          customerName: bookingData.customerName,
          customerEmail: bookingData.customerEmail,
          customerPhone: bookingData.customerPhone || null,
          numberOfPeople: bookingData.numberOfPeople,
          totalPrice: bookingData.totalPrice,
          status: "PENDING_PAYMENT",
        },
        include: {
          room: true,
        },
      });

      // Créer la session Stripe Checkout
      const session = await stripeService.createCheckoutSession(booking);

      // Sauvegarder le session ID dans la réservation
      await prisma.booking.update({
        where: { id: booking.id },
        data: { stripeSessionId: session.id },
      });

      res.json({
        success: true,
        data: {
          bookingId: booking.id,
          sessionId: session.id,
          sessionUrl: session.url,
        },
      });
    } catch (error) {
      console.error("Error creating checkout:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "CHECKOUT_ERROR",
          message: error instanceof Error ? error.message : "Failed to create checkout",
        },
      });
    }
  }

  /**
   * Vérifier le paiement après le retour de Stripe
   * GET /api/payment/verify/:sessionId
   */
  async verifyPayment(req: AuthRequest, res: Response) {
    try {
      const sessionId = req.params.sessionId as string;

      if (process.env.NODE_ENV === "development") {
        console.log("Verifying payment for session:", sessionId);
      }

      // Récupérer la session Stripe
      const session = await stripeService.getSession(sessionId);

      // Récupérer la réservation associée
      let booking = await prisma.booking.findUnique({
        where: { stripeSessionId: sessionId },
        include: {
          room: true,
          payment: true,
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" },
        });
      }

      // Si le paiement est réussi et que la réservation n'a pas encore été mise à jour
      if (session.status === "complete" && session.payment_status === "paid") {
        // Si le paiement n'existe pas encore, le créer
        if (!booking.payment && session.payment_intent) {
          try {
            const paymentIntentId =
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent.id;

            const paymentIntent: any = await stripeService.getPaymentIntent(paymentIntentId);

            // Extraire les informations du charge si disponible
            const charge = paymentIntent.charges?.data?.[0];

            await prisma.payment.create({
              data: {
                bookingId: booking.id,
                amount: session.amount_total! / 100,
                amountCents: session.amount_total!,
                currency: session.currency!,
                stripePaymentIntentId: paymentIntentId,
                stripeChargeId: charge?.id,
                status: "SUCCEEDED",
                paymentMethod: charge?.payment_method_details?.type,
                last4: charge?.payment_method_details?.card?.last4,
                cardBrand: charge?.payment_method_details?.card?.brand,
                receiptUrl: charge?.receipt_url,
              },
            });
          } catch (paymentError) {
            console.error("⚠️ Error creating payment record:", paymentError);
            // Continue même si on ne peut pas créer le payment record
          }
        }

        // Mettre à jour le statut de la réservation si nécessaire
        if (booking.status === "PENDING_PAYMENT") {
          booking = await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: "CONFIRMED",
              stripePaymentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : session.payment_intent?.id,
              paymentDate: new Date(),
            },
            include: {
              room: true,
              payment: true,
            },
          });
        }
      }

      res.json({
        success: true,
        data: {
          booking,
          session: {
            id: session.id,
            status: session.status,
            paymentStatus: session.payment_status,
          },
        },
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "VERIFICATION_ERROR",
          message: error instanceof Error ? error.message : "Failed to verify payment",
        },
      });
    }
  }

  /**
   * Webhook Stripe pour recevoir les événements de paiement
   * POST /api/webhooks/stripe
   */
  async handleWebhook(req: Request, res: Response) {
    const sig = req.headers["stripe-signature"] as string;

    let event: Stripe.Event;

    try {
      // Vérifier la signature du webhook
      event = stripeService.constructWebhookEvent(req.body, sig);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return res
        .status(400)
        .send(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }

    // Traiter l'événement
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case "checkout.session.expired":
          await this.handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
          break;

        case "payment_intent.succeeded":
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case "payment_intent.payment_failed":
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case "charge.refunded":
          await this.handleRefund(event.data.object as Stripe.Charge);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error handling webhook:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }

  /**
   * Gérer la complétion d'une session de paiement
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
      console.error("No bookingId in session metadata");
      return;
    }

    // Créer le paiement
    await prisma.payment.create({
      data: {
        bookingId,
        amount: (session.amount_total || 0) / 100,
        amountCents: session.amount_total || 0,
        currency: session.currency || "eur",
        stripePaymentIntentId: session.payment_intent as string,
        status: "SUCCEEDED",
        paymentMethod: session.payment_method_types?.[0],
      },
    });

    // Mettre à jour la réservation
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CONFIRMED",
        stripePaymentId: session.payment_intent as string,
        paymentDate: new Date(),
      },
    });

    console.log(`✅ Payment completed for booking ${bookingId}`);
    // TODO: Envoyer email de confirmation
    // TODO: Générer QR Code
  }

  /**
   * Gérer l'expiration d'une session de paiement
   */
  private async handleCheckoutExpired(session: Stripe.Checkout.Session) {
    const bookingId = session.metadata?.bookingId;

    if (!bookingId) return;

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED_NO_PAYMENT",
        cancelledAt: new Date(),
      },
    });

    console.log(`Payment expired for booking ${bookingId}`);
  }

  /**
   * Gérer le succès d'un paiement
   */
  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    // Le paiement est déjà géré dans handleCheckoutCompleted
    console.log(`Payment intent succeeded: ${paymentIntent.id}`);
  }

  /**
   * Gérer l'échec d'un paiement
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    console.log(`Payment intent failed: ${paymentIntent.id}`);
    // TODO: Notifier l'utilisateur
  }

  /**
   * Gérer un remboursement
   */
  private async handleRefund(charge: Stripe.Charge) {
    console.log(`Refund processed for charge: ${charge.id}`);
    // Le remboursement est déjà enregistré via requestRefund
  }

  /**
   * Demander un remboursement
   * POST /api/payment/refund
   */
  async requestRefund(req: AuthRequest, res: Response) {
    try {
      const { bookingId, reason } = req.body;
      const userId = req.userId;

      // Récupérer la réservation
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { payment: true },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" },
        });
      }

      // Vérifier que l'utilisateur est propriétaire
      if (booking.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "You can only refund your own bookings" },
        });
      }

      // Vérifier que le paiement existe
      if (!booking.stripePaymentId) {
        return res.status(400).json({
          success: false,
          error: { code: "NO_PAYMENT", message: "No payment found for this booking" },
        });
      }

      // Calculer le montant remboursable
      const refundAmount = stripeService.calculateRefundAmount(booking);

      if (refundAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: "NO_REFUND_AVAILABLE",
            message: "No refund available. Cancellation is less than 24 hours before the booking.",
          },
        });
      }

      // Créer le remboursement Stripe
      const stripeRefund = await stripeService.createRefund(
        booking.stripePaymentId,
        refundAmount,
        reason || "CANCELLED_BY_USER"
      );

      // Enregistrer le remboursement
      await prisma.refund.create({
        data: {
          bookingId,
          amount: refundAmount,
          amountCents: Math.round(refundAmount * 100),
          stripeRefundId: stripeRefund.id,
          reason: reason || "CANCELLED_BY_USER",
          status: "SUCCEEDED",
          processedAt: new Date(),
        },
      });

      // Mettre à jour le statut de la réservation
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: "REFUNDED",
          stripeRefundId: stripeRefund.id,
          cancelledAt: new Date(),
        },
      });

      // Mettre à jour le statut du paiement
      if (refundAmount === booking.totalPrice) {
        await prisma.payment.update({
          where: { bookingId },
          data: { status: "REFUNDED" },
        });
      } else {
        await prisma.payment.update({
          where: { bookingId },
          data: { status: "PARTIALLY_REFUNDED" },
        });
      }

      res.json({
        success: true,
        data: {
          refundAmount,
          refundPercentage: stripeService.getRefundPercentage(booking),
          refundId: stripeRefund.id,
        },
      });
    } catch (error) {
      console.error("Error requesting refund:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "REFUND_ERROR",
          message: error instanceof Error ? error.message : "Failed to process refund",
        },
      });
    }
  }

  /**
   * Calculer le montant remboursable (admin)
   * POST /api/payment/calculate-refund
   */
  async calculateRefund(req: AuthRequest, res: Response) {
    try {
      const { bookingId } = req.body;

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" },
        });
      }

      const refundAmount = stripeService.calculateRefundAmount(booking);
      const refundPercentage = stripeService.getRefundPercentage(booking);

      res.json({
        success: true,
        data: {
          totalPrice: booking.totalPrice,
          refundAmount,
          refundPercentage,
          canRefund: refundAmount > 0,
        },
      });
    } catch (error) {
      console.error("Error calculating refund:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "CALCULATION_ERROR",
          message: error instanceof Error ? error.message : "Failed to calculate refund",
        },
      });
    }
  }
}

export const paymentController = new PaymentController();
