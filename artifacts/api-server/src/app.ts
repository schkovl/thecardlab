import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
import { devAuthMiddleware } from "./lib/auth";
import { getStripe } from "./lib/stripe";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const IS_PROD_APP = process.env.NODE_ENV === "production";
const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (IS_PROD_APP && corsOrigins.length === 0) {
  throw new Error("CORS_ORIGINS must be set in production (comma-separated allowed origins)");
}

app.use(
  cors({
    credentials: true,
    origin: IS_PROD_APP ? corsOrigins : true,
  }),
);
app.use(cookieParser());
app.use(devAuthMiddleware);

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !secret) {
      res.status(503).json({ error: "stripe webhook not configured" });
      return;
    }
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    const sig = Array.isArray(signature) ? signature[0] : signature;
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
    } catch (err) {
      logger.warn({ err }, "stripe webhook signature failed");
      res.status(400).json({ error: "invalid signature" });
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const userId = (session.client_reference_id as string | null) ?? null;
          const customerId = (session.customer as string | null) ?? null;
          const subscriptionId = (session.subscription as string | null) ?? null;
          if (userId) {
            await db
              .update(usersTable)
              .set({
                stripeCustomerId: customerId ?? undefined,
                stripeSubscriptionId: subscriptionId ?? undefined,
                devTier: "pro",
              })
              .where(eq(usersTable.id, userId));
          }
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
        case "customer.subscription.created": {
          const sub = event.data.object as { id: string; customer: string; status: string };
          const tier = ["active", "trialing", "past_due"].includes(sub.status) ? "pro" : null;
          await db
            .update(usersTable)
            .set({ stripeSubscriptionId: sub.id, devTier: tier })
            .where(eq(usersTable.stripeCustomerId, sub.customer));
          break;
        }
        default:
          logger.info({ type: event.type }, "stripe webhook (unhandled)");
      }
      res.status(200).json({ received: true });
    } catch (err) {
      logger.error({ err, type: event.type }, "stripe webhook handler error");
      res.status(500).json({ error: "webhook handler failed" });
    }
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

import type { ErrorRequestHandler } from "express";
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err && typeof err === "object" && (err as { name?: string }).name === "ZodError") {
    res.status(400).json({ error: "validation failed", issues: (err as { issues?: unknown }).issues });
    return;
  }
  logger.error({ err }, "unhandled api error");
  res.status(500).json({ error: "internal server error" });
};
app.use("/api", errorHandler);

export default app;
