import { logger } from './lib/logger';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error('Payload must be a Buffer — ensure webhook route is before express.json()');
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey) throw new Error('STRIPE_SECRET_KEY not configured');

    const { default: StripeLib } = await import('stripe');
    const stripe = new StripeLib(secretKey);

    let event: import('stripe').Stripe.Event;

    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      logger.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
      event = JSON.parse(payload.toString()) as import('stripe').Stripe.Event;
    }

    logger.info({ type: event.type }, 'Stripe webhook received');

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session;
        if (session.subscription && session.metadata?.userId) {
          await storage.updateUserStripeInfo(session.metadata.userId, {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as import('stripe').Stripe.Subscription;
        logger.info({ subscriptionId: sub.id }, 'Subscription deleted');
        break;
      }
      default:
        break;
    }
  }
}
