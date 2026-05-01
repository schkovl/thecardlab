import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();

    console.log('Creating products and prices in Stripe...');

    const existingProducts = await stripe.products.search({
      query: "name:'TheCardLab Pro' AND active:'true'"
    });

    if (existingProducts.data.length > 0) {
      const product = existingProducts.data[0];
      console.log(`TheCardLab Pro already exists (${product.id}). Fetching prices...`);

      const prices = await stripe.prices.list({ product: product.id, active: true });
      for (const price of prices.data) {
        const interval = price.recurring?.interval ?? 'one_time';
        console.log(`  Price: ${price.id}  $${((price.unit_amount ?? 0) / 100).toFixed(2)}/${interval}`);
      }
      return;
    }

    const proProduct = await stripe.products.create({
      name: 'TheCardLab Pro',
      description: 'Unlimited scans, full Vault, market alerts, and tax-ready reports.',
    });
    console.log(`Created product: ${proProduct.name} (${proProduct.id})`);

    const proMonthlyPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 999,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log(`Created monthly price: $9.99/month (${proMonthlyPrice.id})`);

    const proAnnualPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 9588,
      currency: 'usd',
      recurring: { interval: 'year' },
    });
    console.log(`Created annual price: $95.88/year (${proAnnualPrice.id})`);

    console.log('\n✓ Products and prices created successfully!');
    console.log('Add these price IDs to your checkout flow:');
    console.log(`  pro_monthly: ${proMonthlyPrice.id}`);
    console.log(`  pro_annual:  ${proAnnualPrice.id}`);
    console.log('\nWebhooks will sync this data to your database automatically.');
  } catch (error: any) {
    console.error('Error creating products:', error.message);
    process.exit(1);
  }
}

createProducts();
