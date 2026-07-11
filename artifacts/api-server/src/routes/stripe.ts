import { Router, type IRouter } from 'express';
import { eq } from 'drizzle-orm';
import { db, usersTable } from '@workspace/db';
import { requireAuth } from '../middlewares/requireAuth';
import { getStripe, isStripeLive, priceIdForPlan } from '../lib/stripe';
import { logger } from '../lib/logger';

const router: IRouter = Router();

router.get('/me', requireAuth, async (req: any, res) => {
  try {
    const userId = req.auth.userId as string;
    const email = req.auth.email as string | undefined;

    const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const u = rows[0];

    const stripe = getStripe();
    if (stripe && u?.stripeSubscriptionId) {
      const sub = await stripe.subscriptions.retrieve(u.stripeSubscriptionId);
      const isPro = sub.status === 'active' || sub.status === 'trialing';
      res.json({
        id: userId,
        email: u?.email ?? email ?? null,
        stripeCustomerId: u?.stripeCustomerId ?? null,
        subscription: { id: sub.id, status: sub.status, currentPeriodEnd: (sub as any).current_period_end ?? null },
        isPro,
      });
      return;
    }

    const isPro = u?.devTier === 'pro';
    res.json({
      id: userId,
      email: u?.email ?? email ?? null,
      stripeCustomerId: u?.stripeCustomerId ?? null,
      subscription: isPro
        ? { id: 'sub_stub', status: 'active', currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 }
        : null,
      isPro,
    });
  } catch (err) {
    logger.error({ err }, 'GET /me error');
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

router.post('/checkout', requireAuth, async (req: any, res): Promise<void> => {
  try {
    const userId = req.auth.userId as string;
    const email = req.auth.email as string | undefined;
    const { priceId, plan, successUrl, cancelUrl } = req.body as {
      priceId?: string;
      plan?: 'pro_monthly' | 'pro_annual';
      successUrl?: string;
      cancelUrl?: string;
    };

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const successFinal = successUrl ?? `${baseUrl}/?checkout=success`;
    const cancelFinal = cancelUrl ?? `${baseUrl}/?checkout=cancelled`;

    const stripe = getStripe();
    if (!stripe) {
      await db.update(usersTable).set({ devTier: 'pro' }).where(eq(usersTable.id, userId));
      res.json({ url: `${successFinal}${successFinal.includes('?') ? '&' : '?'}dev=1` });
      return;
    }

    let resolvedPriceId = priceId ?? (plan ? priceIdForPlan(plan) : null);
    if (!resolvedPriceId) {
      res.status(400).json({ error: 'priceId or plan required (set STRIPE_PRICE_ID_PRO_MONTHLY/ANNUAL env)' });
      return;
    }

    const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    let user = rows[0];
    let customerId = user?.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email ?? email,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, userId));
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: successFinal,
      cancel_url: cancelFinal,
      client_reference_id: userId,
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, 'POST /checkout error');
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/portal', requireAuth, async (req: any, res): Promise<void> => {
  try {
    const userId = req.auth.userId as string;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const { returnUrl } = req.body as { returnUrl?: string };

    const stripe = getStripe();
    if (!stripe) {
      res.json({ url: `${baseUrl}/?portal=stub` });
      return;
    }

    const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const user = rows[0];
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: 'No Stripe customer found for this user' });
      return;
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl ?? `${baseUrl}/`,
    });
    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, 'POST /portal error');
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

router.get('/prices', async (_req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    res.json({
      data: [
        { id: 'price_pro_monthly_stub', recurring: { interval: 'month' }, unit_amount: 1900, currency: 'usd', product: 'prod_pro' },
        { id: 'price_pro_annual_stub', recurring: { interval: 'year' }, unit_amount: 19000, currency: 'usd', product: 'prod_pro' },
      ],
      mode: 'stub',
    });
    return;
  }
  try {
    const ids = [process.env.STRIPE_PRICE_ID_PRO_MONTHLY, process.env.STRIPE_PRICE_ID_PRO_ANNUAL].filter(Boolean) as string[];
    if (ids.length === 0) {
      const list = await stripe.prices.list({ active: true, limit: 20, expand: ['data.product'] });
      res.json({ data: list.data, mode: 'live-all' });
      return;
    }
    const data = await Promise.all(ids.map((id) => stripe.prices.retrieve(id, { expand: ['product'] })));
    res.json({ data, mode: 'live' });
  } catch (err) {
    logger.error({ err }, 'GET /prices error');
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

router.get('/stripe/status', (_req, res) => {
  res.json({
    live: isStripeLive(),
    monthlyPriceConfigured: !!process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
    annualPriceConfigured: !!process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
    webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
  });
});

export default router;
