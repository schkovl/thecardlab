import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const IS_PROD = process.env.NODE_ENV === "production";

if (IS_PROD && !process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET must be set in production");
}

const SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "tcl_session";
const TOKEN_TTL = "30d";

export type AuthPayload = { userId: string; email: string };

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: IS_PROD ? "strict" : "lax",
    secure: IS_PROD,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function getAuthCookie(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[COOKIE_NAME] ?? null;
}

export function getAuth(req: Request): { userId: string | null } {
  const auth = (req as Request & { auth?: { userId: string } }).auth;
  return { userId: auth?.userId ?? null };
}

export function devAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const token = getAuthCookie(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      (req as Request & { auth?: { userId: string; email: string } }).auth = {
        userId: payload.userId,
        email: payload.email,
      };
    }
  }
  next();
}
