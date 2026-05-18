import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/readyz", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ status: "ready", db: "ok", ts: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: "not_ready", db: "fail", error: (err as Error).message });
  }
});

export default router;
