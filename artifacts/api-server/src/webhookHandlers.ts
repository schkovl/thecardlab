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
        const userId = session.metadata?.userId;
        if (!userId) {
          logger.warn({ sessionId: session.id }, 'checkout.session.completed: missing userId in metadata');
          break;
        }
        if (session.subscription) {
          await storage.updateUserStripeInfo(userId, {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            subscriptionStatus: 'active',
          });
          logger.info({ userId, subscriptionId: session.subscription }, 'Subscription linked to user and marked active');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as import('stripe').Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) {
          logger.warn({ subscriptionId: sub.id, customerId: sub.customer }, 'subscription.updated: no userId in metadata, skipping');
          break;
        }
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
        await storage.updateUserStripeInfo(userId, {
          subscriptionStatus: sub.status,
          subscriptionPeriodEnd: periodEnd,
        });
        logger.info({ userId, subscriptionId: sub.id, status: sub.status }, 'Subscription status updated');
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as import('stripe').Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await storage.updateUserStripeInfo(userId, {
            stripeSubscriptionId: null,
            subscriptionStatus: 'cancelled',
            subscriptionPeriodEnd: null,
          });
          logger.info({ userId, subscriptionId: sub.id }, 'Subscription cancelled — cleared from user');
        } else {
          logger.warn({ subscriptionId: sub.id }, 'subscription.deleted: no userId in metadata');
        }
        break;
      }

      default:
        break;
    }
  }
}
