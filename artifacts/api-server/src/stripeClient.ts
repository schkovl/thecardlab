import type Stripe from 'stripe';

export async function getUncachableStripeClient(): Promise<Stripe> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  const { default: StripeLib } = await import('stripe');
  return new StripeLib(secretKey);
}
