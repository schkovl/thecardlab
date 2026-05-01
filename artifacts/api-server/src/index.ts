import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — Stripe initialization skipped");
    return;
  }

  try {
    logger.info("Initializing Stripe schema...");
    try {
      await runMigrations({ databaseUrl });
      logger.info("Stripe schema ready");
    } catch (migErr) {
      logger.warn({ migErr }, "runMigrations encountered an issue (may already be applied), continuing...");
    }

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const webhookResult = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`
    );
    logger.info(
      { webhook: (webhookResult as any)?.webhook?.url ?? "setup complete" },
      "Webhook configured"
    );

    stripeSync
      .syncBackfill()
      .then(() => logger.info("Stripe data synced"))
      .catch((err) => logger.error({ err }, "Error syncing Stripe data"));

    logger.info("Stripe initialized successfully");
  } catch (err) {
    logger.error({ err }, "Stripe initialization failed — server will start but Stripe routes will not work until integration is connected");
  }
}

await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
