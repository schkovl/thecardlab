import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import app from "./app";
import { logger } from "./lib/logger";
import { db, showsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function seedShows() {
  try {
    const existing = await db.execute(sql`SELECT count(*)::int AS c FROM shows`);
    const c = (existing.rows[0] as { c: number })?.c ?? 0;
    if (c > 0) return;

    const tier1: Array<typeof showsTable.$inferInsert> = [
      { name: "The National Sports Collectors Convention", city: "Rosemont", state: "IL", venue: "Donald E. Stephens Convention Center", startDate: "2026-07-29", endDate: "2026-08-02", description: "The biggest sports card show in the world. 700+ dealers, every major manufacturer, premier autograph guests, all sports.", website: "https://nsccshow.com", expectedAttendees: 100000, isOfficial: true, tier: "tier1", country: "US" },
      { name: "Dallas Card Show — Summer", city: "Frisco", state: "TX", venue: "Embassy Suites by Hilton Dallas Frisco", startDate: "2026-06-12", endDate: "2026-06-14", description: "Top regional show. 400+ dealers, premium autograph guests. Held multiple times per year.", website: "https://dallascardshow.com", expectedAttendees: 30000, isOfficial: true, tier: "tier1", country: "US" },
      { name: "East Coast National", city: "Atlantic City", state: "NJ", venue: "Showboat Hotel", startDate: "2026-04-30", endDate: "2026-05-03", description: "Premier East Coast vintage + modern. Strong dealer presence from NY/NJ/PA.", website: "https://ecnationalsportscard.com", expectedAttendees: 18000, isOfficial: true, tier: "tier1", country: "US" },
      { name: "Chantilly Show", city: "Chantilly", state: "VA", venue: "Dulles Expo Center", startDate: "2026-11-13", endDate: "2026-11-15", description: "Long-running, top East Coast DC-area show. Three editions per year.", website: "https://chantillyshow.com", expectedAttendees: 12000, isOfficial: true, tier: "tier1", country: "US" },
      { name: "Philly Show", city: "Oaks", state: "PA", venue: "Greater Philadelphia Expo Center", startDate: "2026-08-07", endDate: "2026-08-09", description: "Major mid-Atlantic show, vintage + modern mix.", website: "https://thephillyshow.com", expectedAttendees: 15000, isOfficial: true, tier: "tier1", country: "US" },
      { name: "Long Beach Expo", city: "Long Beach", state: "CA", venue: "Long Beach Convention Center", startDate: "2026-09-10", endDate: "2026-09-12", description: "West Coast premier expo. Sports cards + coins + collectibles.", website: "https://longbeachexpo.com", expectedAttendees: 20000, isOfficial: true, tier: "tier1", country: "US" },
      { name: "Sport Card & Memorabilia Expo (Toronto)", city: "Toronto", state: "ON", venue: "International Centre, Mississauga", startDate: "2026-05-08", endDate: "2026-05-10", description: "Largest sports card show in Canada. Spring edition. Hockey-heavy, also strong basketball + baseball.", website: "https://sportcardexpo.com", expectedAttendees: 35000, isOfficial: true, tier: "tier1", country: "CA" },
      { name: "Sport Card Expo Fall (Toronto)", city: "Toronto", state: "ON", venue: "International Centre, Mississauga", startDate: "2026-11-06", endDate: "2026-11-08", description: "Fall edition of Canada's largest sports card show.", website: "https://sportcardexpo.com", expectedAttendees: 35000, isOfficial: true, tier: "tier1", country: "CA" },
      { name: "Houston Tristar Collectors Show", city: "Houston", state: "TX", venue: "NRG Center", startDate: "2026-02-13", endDate: "2026-02-15", description: "Long-running Texas show, strong autograph guest lineup.", website: "https://tristarproductions.com", expectedAttendees: 14000, isOfficial: true, tier: "tier1", country: "US" },
      { name: "Sun Times Show", city: "Rosemont", state: "IL", venue: "Donald E. Stephens Convention Center", startDate: "2026-03-27", endDate: "2026-03-29", description: "Chicago-area pre-National tune-up. Quality vintage dealers.", website: null, expectedAttendees: 8000, isOfficial: true, tier: "tier1", country: "US" },
    ];

    const tier2: Array<typeof showsTable.$inferInsert> = [
      { name: "Strongsville Sports Card Show", city: "Strongsville", state: "OH", venue: "Cuyahoga County Fairgrounds", startDate: "2026-04-18", endDate: "2026-04-19", description: "Cleveland-area regional, strong Midwest collector base.", expectedAttendees: 4000, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Detroit Sports Card Show", city: "Madison Heights", state: "MI", venue: "Best Western Plus Sterling", startDate: "2026-03-21", endDate: "2026-03-22", description: "Long-running Detroit regional. Mix of vintage + modern.", expectedAttendees: 3500, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Atlanta Sports Card & Memorabilia Show", city: "Atlanta", state: "GA", venue: "Cobb Galleria Centre", startDate: "2026-09-19", endDate: "2026-09-21", description: "Southeastern hub for grading and high-end vintage.", expectedAttendees: 6000, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Sun Valley Sports Card Show", city: "West Springfield", state: "MA", venue: "Eastern States Exposition", startDate: "2026-06-19", endDate: "2026-06-21", description: "New England's largest regional. Strong vintage.", expectedAttendees: 5000, isOfficial: true, tier: "tier2", country: "US" },
      { name: "St. Louis Sports Collectors Convention", city: "Collinsville", state: "IL", venue: "Gateway Convention Center", startDate: "2026-10-23", endDate: "2026-10-25", description: "Midwest regional, Cardinals + Blues collector base.", expectedAttendees: 3000, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Vegas Industry Summit", city: "Las Vegas", state: "NV", venue: "Mandalay Bay Convention Center", startDate: "2026-08-19", endDate: "2026-08-21", description: "Industry-focused, breakers + manufacturers heavy.", expectedAttendees: 6000, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Phoenix Sports Card Show", city: "Phoenix", state: "AZ", venue: "Arizona Grand Resort", startDate: "2026-02-27", endDate: "2026-03-01", description: "Spring training-timed Phoenix show. MLB-heavy.", expectedAttendees: 3500, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Denver Sports Memorabilia Show", city: "Denver", state: "CO", venue: "Crowne Plaza Denver Airport", startDate: "2026-05-15", endDate: "2026-05-17", description: "Rocky Mountain regional. Growing modern presence.", expectedAttendees: 2500, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Seattle Cardboard Convention", city: "Seattle", state: "WA", venue: "DoubleTree Suites Southcenter", startDate: "2026-07-11", endDate: "2026-07-12", description: "PNW regional. Vintage Mariners + Seahawks.", expectedAttendees: 2000, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Twin Cities Card Show", city: "Brooklyn Park", state: "MN", venue: "Earle Brown Heritage Center", startDate: "2026-09-26", endDate: "2026-09-27", description: "Minnesota regional, hockey + Vikings heavy.", expectedAttendees: 2500, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Robert Morris Sports Card Show", city: "Moon Township", state: "PA", venue: "Robert Morris University", startDate: "2026-10-10", endDate: "2026-10-11", description: "Pittsburgh-area Steelers/Penguins-focused.", expectedAttendees: 2000, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Florida Sports Memorabilia Show", city: "Tampa", state: "FL", venue: "Florida State Fairgrounds", startDate: "2026-01-30", endDate: "2026-02-01", description: "Florida regional, snowbird-heavy attendance.", expectedAttendees: 4000, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Bay Area Sports Card Show", city: "San Mateo", state: "CA", venue: "San Mateo County Event Center", startDate: "2026-04-04", endDate: "2026-04-05", description: "Northern California regional. Strong vintage.", expectedAttendees: 3000, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Charlotte Sports Card Show", city: "Charlotte", state: "NC", venue: "Charlotte Convention Center", startDate: "2026-06-27", endDate: "2026-06-28", description: "Carolinas regional, ACC + NASCAR heavy.", expectedAttendees: 2500, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Kansas City Sports Card Show", city: "Overland Park", state: "KS", venue: "Overland Park Convention Center", startDate: "2026-08-22", endDate: "2026-08-23", description: "Heartland regional. Royals/Chiefs collector base.", expectedAttendees: 2200, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Nashville Sports Card Show", city: "Franklin", state: "TN", venue: "Williamson County AgExpo", startDate: "2026-10-17", endDate: "2026-10-18", description: "Mid-South regional. SEC football + Titans/Preds.", expectedAttendees: 2000, isOfficial: true, tier: "tier2", country: "US" },
      { name: "San Diego Sports Card Show", city: "San Diego", state: "CA", venue: "Town & Country Resort", startDate: "2026-11-21", endDate: "2026-11-22", description: "Southern California regional. Padres + Chargers vintage.", expectedAttendees: 2500, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Salt Lake City Sports Card Show", city: "Sandy", state: "UT", venue: "Mountain America Expo Center", startDate: "2026-03-14", endDate: "2026-03-15", description: "Intermountain regional. Jazz + BYU/Utah.", expectedAttendees: 1800, isOfficial: true, tier: "tier2", country: "US" },
      { name: "Montreal Sports Card Expo", city: "Montreal", state: "QC", venue: "Pierre-Charbonneau Centre", startDate: "2026-04-25", endDate: "2026-04-26", description: "Largest Quebec/East Canada show. Hockey-dominant.", expectedAttendees: 8000, isOfficial: true, tier: "tier2", country: "CA" },
      { name: "Vancouver Card Show", city: "Vancouver", state: "BC", venue: "Croatian Cultural Centre", startDate: "2026-06-06", endDate: "2026-06-07", description: "West Canada regional. Canucks + vintage hockey.", expectedAttendees: 4000, isOfficial: true, tier: "tier2", country: "CA" },
      { name: "Calgary Sports Card Expo", city: "Calgary", state: "AB", venue: "BMO Centre at Stampede Park", startDate: "2026-09-12", endDate: "2026-09-13", description: "Alberta regional. Flames + CFL heavy.", expectedAttendees: 3500, isOfficial: true, tier: "tier2", country: "CA" },
      { name: "Ottawa Sports Card Show", city: "Ottawa", state: "ON", venue: "Nepean Sportsplex", startDate: "2026-02-21", endDate: "2026-02-22", description: "Eastern Ontario regional. Senators + hockey vintage.", expectedAttendees: 2500, isOfficial: true, tier: "tier2", country: "CA" },
      { name: "Winnipeg Sports Card Show", city: "Winnipeg", state: "MB", venue: "Canad Inns Polo Park", startDate: "2026-05-23", endDate: "2026-05-24", description: "Prairies regional. Jets + CFL.", expectedAttendees: 1500, isOfficial: true, tier: "tier2", country: "CA" },
      { name: "Edmonton Sports Card Show", city: "Edmonton", state: "AB", venue: "Edmonton EXPO Centre", startDate: "2026-10-03", endDate: "2026-10-04", description: "Northern Alberta regional. Oilers + vintage.", expectedAttendees: 3000, isOfficial: true, tier: "tier2", country: "CA" },
    ];

    await db.insert(showsTable).values([...tier1, ...tier2]);
    logger.info(`Seeded ${tier1.length} tier1 + ${tier2.length} tier2 shows`);
  } catch (err) {
    logger.warn({ err }, "show seed failed (non-fatal)");
  }
}

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
  if (process.env.STRIPE_SECRET_KEY) {
    logger.info("Direct Stripe SDK mode (STRIPE_SECRET_KEY set) — skipping Replit sync");
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — Stripe initialization skipped");
    return;
  }

  try {
    logger.info("Initializing Stripe schema (Replit mode)...");
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
    logger.warn({ err: (err as Error)?.message }, "Stripe (Replit mode) initialization skipped — set STRIPE_SECRET_KEY for direct SDK mode");
  }
}

await initStripe();
await seedShows();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
