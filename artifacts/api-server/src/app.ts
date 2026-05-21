import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "https://thecardlab.app,https://www.thecardlab.app")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

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

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(
  cors({
    credentials: true,
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (process.env.NODE_ENV !== "production") return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed`));
    },
  }),
);

const keyByAuth = (req: express.Request) => {
  const auth = (req as unknown as { auth?: { userId?: string } }).auth;
  return auth?.userId ?? req.ip ?? "anon";
};

const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  keyGenerator: keyByAuth,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  keyGenerator: keyByAuth,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const marketLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  keyGenerator: keyByAuth,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api/analyze-listing", aiLimiter);
app.use("/api/market", marketLimiter);
app.use(["/api/scans", "/api/grading-submissions", "/api/wantlist", "/api/portfolio"], (req, _res, next) =>
  req.method === "GET" ? next() : writeLimiter(req, _res, next),
);

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }

    const sig = Array.isArray(signature) ? signature[0] : signature;

    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
