import { Router, type IRouter } from 'express';
import { requireAuth } from '@clerk/express';
import { storage } from '../storage';
import { stripeService } from '../stripeService';
import { logger } from '../lib/logger';

const router: IRouter = Router();

router.get('/me', requireAuth(), async (req: any, res) => {
  try {
    const userId = req.auth.userId as string;
    const email = req.auth.sessionClaims?.email as string | undefined;

    let user = await storage.getUser(userId);
    if (!user) {
      user = await storage.upsertUser(userId, email);
    }

    let subscription = null;
    if (user?.stripeSubscriptionId) {
      subscription = await storage.getSubscription(user.stripeSubscriptionId);
    }

    const isPro = subscription?.status === 'active' || subscription?.status === 'trialing';

    res.json({
      id: userId,
      email: user?.email,
      stripeCustomerId: user?.stripeCustomerId,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
          }
        : null,
      isPro,
    });
  } catch (err) {
    logger.error({ err }, 'GET /me error');
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

router.post('/checkout', requireAuth(), async (req: any, res): Promise<void> => {
  try {
    const userId = req.auth.userId as string;
    const email = req.auth.sessionClaims?.email as string | undefined;
    const { priceId, plan, successUrl, cancelUrl } = req.body as {
      priceId?: string;
      plan?: 'pro_monthly' | 'pro_annual';
      successUrl: string;
      cancelUrl: string;
    };

    let resolvedPriceId = priceId;

    if (!resolvedPriceId && plan) {
      const interval = plan === 'pro_annual' ? 'year' : 'month';
      const prices = await storage.listPrices(true, 50, 0);
      const match = (prices as Array<{ id: string; recurring?: { interval?: string } }>).find(
        (p) => p.recurring?.interval === interval
      );
      if (!match) {
        res.status(400).json({ error: `No price found for plan: ${plan}. Run the seed-products script first.` });
        return;
      }
      resolvedPriceId = match.id;
    }

    if (!resolvedPriceId) {
      res.status(400).json({ error: 'priceId or plan is required' });
      return;
    }

    let user = await storage.getUser(userId);
    if (!user) {
      user = await storage.upsertUser(userId, email);
    }

    let customerId = user?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(email ?? '', userId);
      await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const session = await stripeService.createCheckoutSession(
      customerId,
      resolvedPriceId,
      successUrl ?? `${baseUrl}/?checkout=success`,
      cancelUrl ?? `${baseUrl}/?checkout=cancelled`
    );

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, 'POST /checkout error');
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/portal', requireAuth(), async (req: any, res): Promise<void> => {
  try {
    const userId = req.auth.userId as string;
    const user = await storage.getUser(userId);

    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: 'No Stripe customer found for this user' });
      return;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const { returnUrl } = req.body as { returnUrl?: string };
    const session = await stripeService.createCustomerPortalSession(
      user.stripeCustomerId,
      returnUrl ?? `${baseUrl}/`
    );

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, 'POST /portal error');
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

router.get('/prices', async (_req, res) => {
  try {
    const prices = await storage.listPrices();
    res.json({ data: prices });
  } catch (err) {
    logger.error({ err }, 'GET /prices error');
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

export default router;
