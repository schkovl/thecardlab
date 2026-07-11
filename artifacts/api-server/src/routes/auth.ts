import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, setAuthCookie, clearAuthCookie, getAuth } from "../lib/auth";
import { autoSeed } from "../lib/seed";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/auth/signup", async (req, res) => {
  const { email, password, firstName, lastName } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "password must be at least 8 characters" });
    return;
  }
  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "user already exists" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    await db.insert(usersTable).values({
      id: userId,
      email,
      passwordHash,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
    });
    const token = signToken({ userId, email });
    setAuthCookie(res, token);
    await autoSeed(userId);
    res.json({ user: { id: userId, email, firstName: firstName ?? null, lastName: lastName ?? null } });
  } catch (err) {
    logger.error({ err }, "signup error");
    res.status(500).json({ error: "signup failed" });
  }
});

router.post("/auth/signin", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    const user = rows[0];
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "invalid credentials" });
      return;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "invalid credentials" });
      return;
    }
    const token = signToken({ userId: user.id, email: user.email ?? "" });
    setAuthCookie(res, token);
    res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
  } catch (err) {
    logger.error({ err }, "signin error");
    res.status(500).json({ error: "signin failed" });
  }
});

router.post("/auth/signout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const user = rows[0];
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } });
  } catch (err) {
    logger.error({ err }, "me error");
    res.status(500).json({ error: "failed" });
  }
});

export default router;
