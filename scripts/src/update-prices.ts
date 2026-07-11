import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) throw new Error('STRIPE_SECRET_KEY not set');

const stripe = new Stripe(secretKey);

async function main() {
  // Find TheCardLab Pro product
  const products = await stripe.products.search({
    query: "name:'TheCardLab Pro' AND active:'true'",
  });

  let productId: string;

  if (products.data.length > 0) {
    productId = products.data[0].id;
    console.log(`Found existing product: ${productId}`);
  } else {
    const product = await stripe.products.create({
      name: 'TheCardLab Pro',
      description: 'Unlimited scans, deal screener, grading tracker, market alerts, and priority support.',
    });
    productId = product.id;
    console.log(`Created product: ${productId}`);
  }

  // List existing active prices for this product
  const existingPrices = await stripe.prices.list({ product: productId, active: true });
  console.log(`Found ${existingPrices.data.length} existing active prices`);

  // Archive old prices
  for (const price of existingPrices.data) {
    await stripe.prices.update(price.id, { active: false });
    const amount = ((price.unit_amount ?? 0) / 100).toFixed(2);
    console.log(`  Archived: ${price.id} — $${amount}/${price.recurring?.interval ?? 'one_time'}`);
  }

  // Create $19/mo
  const monthly = await stripe.prices.create({
    product: productId,
    unit_amount: 1900,    // $19.00
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  console.log(`Created monthly: $19.00/month (${monthly.id})`);

  // Create $190/yr (save ~17%)
  const annual = await stripe.prices.create({
    product: productId,
    unit_amount: 19000,   // $190.00
    currency: 'usd',
    recurring: { interval: 'year' },
  });
  console.log(`Created annual: $190.00/year (${annual.id})`);

  console.log('\n✓ Stripe prices updated to $19/mo and $190/yr');
  console.log(`  pro_monthly price ID: ${monthly.id}`);
  console.log(`  pro_annual  price ID: ${annual.id}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
