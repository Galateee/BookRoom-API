import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export class StripeService {
  /**
   * Créer une session de paiement Stripe Checkout
   */
  async createCheckoutSession(booking: any) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "eur",
              unit_amount: Math.round(booking.totalPrice * 100),
              product_data: {
                name: `Réservation - ${booking.room.name}`,
                description: `${booking.date} de ${booking.startTime} à ${booking.endTime} (${booking.numberOfPeople} personnes)`,
                images: booking.room.imageUrl ? [booking.room.imageUrl] : [],
              },
            },
            quantity: 1,
          },
        ],
        customer_email: booking.customerEmail,
        client_reference_id: booking.id,
        metadata: {
          bookingId: booking.id,
          userId: booking.userId,
          roomId: booking.roomId,
          roomName: booking.room.name,
        },
        success_url: `${process.env.FRONTEND_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/booking-cancelled?booking_id=${booking.id}`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      });

      return session;
    } catch (error) {
      console.error("Error creating Stripe checkout session:", error);
      throw new Error("Failed to create checkout session");
    }
  }

  /**
   * Récupérer une session de paiement
   */
  async getSession(sessionId: string) {
    try {
      return await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error("Error retrieving Stripe session:", error);
      throw new Error("Failed to retrieve session");
    }
  }

  /**
   * Récupérer un Payment Intent
   */
  async getPaymentIntent(paymentIntentId: string) {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["charges"],
      });
    } catch (error) {
      console.error("Error retrieving payment intent:", error);
      throw new Error("Failed to retrieve payment intent");
    }
  }

  /**
   * Créer un remboursement
   */
  async createRefund(
    paymentIntentId: string,
    amount: number,
    reason: string = "requested_by_customer"
  ) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(amount * 100),
        reason: "requested_by_customer",
        metadata: {
          refundReason: reason,
        },
      });

      return refund;
    } catch (error) {
      console.error("Error creating Stripe refund:", error);
      throw new Error("Failed to create refund");
    }
  }

  /**
   * Créer un remboursement partiel
   */
  async createPartialRefund(
    paymentIntentId: string,
    amount: number,
    reason: string = "requested_by_customer"
  ) {
    return this.createRefund(paymentIntentId, amount, reason);
  }

  /**
   * Vérifier la signature du webhook
   */
  constructWebhookEvent(payload: Buffer, signature: string) {
    try {
      return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (error) {
      console.error("Error verifying webhook signature:", error);
      throw new Error("Webhook signature verification failed");
    }
  }

  /**
   * Récupérer le reçu d'un paiement
   */
  async getCharge(chargeId: string) {
    try {
      return await stripe.charges.retrieve(chargeId);
    } catch (error) {
      console.error("Error retrieving charge:", error);
      throw new Error("Failed to retrieve charge");
    }
  }

  /**
   * Lister tous les paiements d'un client
   */
  async listPayments(customerEmail: string, limit: number = 10) {
    try {
      const paymentIntents = await stripe.paymentIntents.list({
        limit,
      });

      return paymentIntents.data.filter((pi) => pi.receipt_email === customerEmail);
    } catch (error) {
      console.error("Error listing payments:", error);
      throw new Error("Failed to list payments");
    }
  }

  /**
   * Calculer le montant remboursable selon la politique d'annulation
   */
  calculateRefundAmount(booking: any): number {
    const now = new Date();
    const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilBooking >= 48) {
      return booking.totalPrice;
    } else if (hoursUntilBooking >= 24) {
      return booking.totalPrice * 0.5;
    } else {
      return 0;
    }
  }

  /**
   * Obtenir le pourcentage de remboursement
   */
  getRefundPercentage(booking: any): number {
    const refundAmount = this.calculateRefundAmount(booking);
    return Math.round((refundAmount / booking.totalPrice) * 100);
  }
}

export const stripeService = new StripeService();
