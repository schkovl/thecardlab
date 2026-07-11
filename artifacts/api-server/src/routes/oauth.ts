import { Router, type IRouter, type Request, type Response } from "express";
import { generateState, generateCodeVerifier } from "arctic";
import { db, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  getGoogle,
  getFacebook,
  getMicrosoft,
  getApple,
  listProviders,
  fetchGoogleUserInfo,
  fetchFacebookUserInfo,
  fetchMicrosoftUserInfo,
  parseAppleIdToken,
  type ProviderId,
  type OAuthUserInfo,
} from "../lib/oauth";
import { signToken, setAuthCookie } from "../lib/auth";
import { autoSeed } from "../lib/seed";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const STATE_COOKIE = "tcl_oauth_state";
const VERIFIER_COOKIE = "tcl_oauth_verifier";

function setStateCookies(res: Response, state: string, verifier: string | null): void {
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: false, maxAge: 10 * 60 * 1000, path: "/" };
  res.cookie(STATE_COOKIE, state, opts);
  if (verifier) res.cookie(VERIFIER_COOKIE, verifier, opts);
}

function clearStateCookies(res: Response): void {
  res.clearCookie(STATE_COOKIE, { path: "/" });
  res.clearCookie(VERIFIER_COOKIE, { path: "/" });
}

function readState(req: Request): { state: string | null; verifier: string | null } {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
  return { state: cookies[STATE_COOKIE] ?? null, verifier: cookies[VERIFIER_COOKIE] ?? null };
}

const IS_PROD = process.env.NODE_ENV === "production";
const MOCK_OAUTH = process.env.MOCK_OAUTH === "1" && !IS_PROD;

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;");
}

router.get("/auth/oauth/providers", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (MOCK_OAUTH) {
    res.json({
      providers: [
        { id: "google", label: "Google", configured: true },
        { id: "apple", label: "Apple", configured: true },
        { id: "facebook", label: "Facebook", configured: true },
        { id: "microsoft", label: "Microsoft", configured: true },
      ],
    });
    return;
  }
  res.json({ providers: listProviders() });
});

router.get("/auth/oauth/:provider/mock", (req, res) => {
  if (!MOCK_OAUTH) {
    res.status(404).send("not found");
    return;
  }
  const provider = req.params.provider as ProviderId;
  const labels: Record<ProviderId, string> = {
    google: "Google",
    apple: "Apple",
    facebook: "Facebook",
    microsoft: "Microsoft",
  };
  const colors: Record<ProviderId, string> = {
    google: "#4285F4",
    apple: "#000000",
    facebook: "#1877F2",
    microsoft: "#0078D4",
  };
  const label = labels[provider] ?? "Provider";
  const color = colors[provider] ?? "#333";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Sign in with ${label}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .card { background: white; border-radius: 12px; padding: 32px; max-width: 400px; width: 100%; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
  .logo { width: 56px; height: 56px; border-radius: 12px; background: ${color}; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; margin: 0 auto 16px; }
  h1 { margin: 0 0 4px; text-align: center; font-size: 20px; color: #111; }
  .sub { text-align: center; color: #666; font-size: 14px; margin-bottom: 24px; }
  label { display: block; font-size: 13px; color: #444; margin: 12px 0 4px; font-weight: 500; }
  input { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
  input:focus { outline: none; border-color: ${color}; }
  button { width: 100%; padding: 12px; background: ${color}; color: white; border: 0; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: pointer; margin-top: 20px; }
  button:hover { opacity: 0.9; }
  .note { text-align: center; font-size: 12px; color: #999; margin-top: 16px; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">${label.charAt(0)}</div>
  <h1>Continue with ${label}</h1>
  <div class="sub">to TheCardLab</div>
  <form method="post" action="/api/auth/oauth/${provider}/mock-complete">
    <label for="email">Email</label>
    <input type="email" id="email" name="email" required value="${escapeHtmlAttr((req.query.email as string) ?? "")}" />
    <label for="firstName">First name</label>
    <input type="text" id="firstName" name="firstName" />
    <label for="lastName">Last name</label>
    <input type="text" id="lastName" name="lastName" />
    <button type="submit">Continue</button>
  </form>
  <div class="note">Mock provider — local dev only</div>
</div>
</body>
</html>`);
});

router.post("/auth/oauth/:provider/mock-complete", async (req, res) => {
  if (!MOCK_OAUTH) {
    res.status(404).send("not found");
    return;
  }
  const provider = req.params.provider as ProviderId;
  const email = (req.body?.email as string | undefined)?.trim();
  const firstName = (req.body?.firstName as string | undefined)?.trim() || null;
  const lastName = (req.body?.lastName as string | undefined)?.trim() || null;
  if (!email) {
    res.status(400).send("email required");
    return;
  }
  try {
    const info = {
      providerUserId: `mock_${provider}_${Buffer.from(email).toString("base64url").slice(0, 16)}`,
      email,
      emailVerified: true,
      firstName,
      lastName,
      imageUrl: null,
    };
    await upsertUserAndSignIn(res, provider, info);
    res.redirect("/");
  } catch (err) {
    logger.error({ err, provider }, "mock oauth complete failed");
    res.status(500).send("mock oauth failed");
  }
});

router.get("/auth/oauth/:provider/start", (req, res) => {
  const provider = req.params.provider as ProviderId;

  if (MOCK_OAUTH) {
    res.redirect(`/api/auth/oauth/${provider}/mock`);
    return;
  }

  const state = generateState();

  try {
    if (provider === "google") {
      const g = getGoogle();
      if (!g) {
        res.status(503).json({ error: "google oauth not configured" });
        return;
      }
      const verifier = generateCodeVerifier();
      const url = g.createAuthorizationURL(state, verifier, ["openid", "profile", "email"]);
      setStateCookies(res, state, verifier);
      res.redirect(url.toString());
      return;
    }
    if (provider === "facebook") {
      const f = getFacebook();
      if (!f) {
        res.status(503).json({ error: "facebook oauth not configured" });
        return;
      }
      const url = f.createAuthorizationURL(state, ["email", "public_profile"]);
      setStateCookies(res, state, null);
      res.redirect(url.toString());
      return;
    }
    if (provider === "microsoft") {
      const m = getMicrosoft();
      if (!m) {
        res.status(503).json({ error: "microsoft oauth not configured" });
        return;
      }
      const verifier = generateCodeVerifier();
      const url = m.createAuthorizationURL(state, verifier, ["openid", "profile", "email", "User.Read"]);
      setStateCookies(res, state, verifier);
      res.redirect(url.toString());
      return;
    }
    if (provider === "apple") {
      const a = getApple();
      if (!a) {
        res.status(503).json({ error: "apple oauth not configured" });
        return;
      }
      const url = a.createAuthorizationURL(state, ["name", "email"]);
      url.searchParams.set("response_mode", "form_post");
      setStateCookies(res, state, null);
      res.redirect(url.toString());
      return;
    }
    res.status(404).json({ error: "unknown provider" });
  } catch (err) {
    logger.error({ err, provider }, "oauth start failed");
    res.status(500).json({ error: "oauth start failed" });
  }
});

async function upsertUserAndSignIn(
  res: Response,
  provider: ProviderId,
  info: OAuthUserInfo,
): Promise<void> {
  let userId: string;
  let email: string | null = info.email;
  let createdNew = false;

  const byProvider = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.provider, provider), eq(usersTable.providerUserId, info.providerUserId)))
    .limit(1);

  if (byProvider[0]) {
    userId = byProvider[0].id;
    email = byProvider[0].email ?? email;
  } else if (info.email && info.emailVerified) {
    const byEmail = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, info.email))
      .limit(1);
    if (byEmail[0]) {
      const existing = byEmail[0];
      if (existing.provider && existing.provider !== provider) {
        throw new Error(
          `email already linked to ${existing.provider}. sign in with that provider, then link ${provider} from settings`,
        );
      }
      userId = existing.id;
      await db
        .update(usersTable)
        .set({
          provider,
          providerUserId: info.providerUserId,
          firstName: existing.firstName ?? info.firstName,
          lastName: existing.lastName ?? info.lastName,
          imageUrl: existing.imageUrl ?? info.imageUrl,
        })
        .where(eq(usersTable.id, userId));
    } else {
      userId = `usr_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      await db.insert(usersTable).values({
        id: userId,
        email: info.email,
        firstName: info.firstName,
        lastName: info.lastName,
        provider,
        providerUserId: info.providerUserId,
        imageUrl: info.imageUrl,
      });
      createdNew = true;
    }
  } else {
    userId = `usr_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    await db.insert(usersTable).values({
      id: userId,
      email: null,
      firstName: info.firstName,
      lastName: info.lastName,
      provider,
      providerUserId: info.providerUserId,
      imageUrl: info.imageUrl,
    });
    createdNew = true;
  }

  const token = signToken({ userId, email: email ?? "" });
  setAuthCookie(res, token);
  if (createdNew) await autoSeed(userId);
}

async function handleCallback(req: Request, res: Response, provider: ProviderId): Promise<void> {
  const isApple = provider === "apple";
  const incoming = isApple ? req.body : req.query;
  const code = (incoming?.code as string | undefined) ?? null;
  const incomingState = (incoming?.state as string | undefined) ?? null;
  const formUser = isApple ? ((incoming?.user as string | undefined) ?? null) : null;

  const { state: cookieState, verifier } = readState(req);
  clearStateCookies(res);

  if (!code || !incomingState || !cookieState || incomingState !== cookieState) {
    res.status(400).send("invalid oauth state");
    return;
  }

  try {
    let info: OAuthUserInfo;

    if (provider === "google") {
      const g = getGoogle();
      if (!g || !verifier) {
        res.status(503).send("google not configured");
        return;
      }
      const tokens = await g.validateAuthorizationCode(code, verifier);
      info = await fetchGoogleUserInfo(tokens.accessToken());
    } else if (provider === "facebook") {
      const f = getFacebook();
      if (!f) {
        res.status(503).send("facebook not configured");
        return;
      }
      const tokens = await f.validateAuthorizationCode(code);
      info = await fetchFacebookUserInfo(tokens.accessToken());
    } else if (provider === "microsoft") {
      const m = getMicrosoft();
      if (!m || !verifier) {
        res.status(503).send("microsoft not configured");
        return;
      }
      const tokens = await m.validateAuthorizationCode(code, verifier);
      info = await fetchMicrosoftUserInfo(tokens.accessToken());
    } else if (provider === "apple") {
      const a = getApple();
      if (!a) {
        res.status(503).send("apple not configured");
        return;
      }
      const tokens = await a.validateAuthorizationCode(code);
      const idToken = tokens.idToken();
      info = parseAppleIdToken(idToken, formUser);
    } else {
      res.status(404).send("unknown provider");
      return;
    }

    await upsertUserAndSignIn(res, provider, info);
    res.redirect("/");
  } catch (err) {
    logger.error({ err, provider }, "oauth callback failed");
    res.status(500).send("oauth callback failed");
  }
}

router.get("/auth/oauth/:provider/callback", async (req, res) => {
  await handleCallback(req, res, req.params.provider as ProviderId);
});

router.post("/auth/oauth/apple/callback", async (req, res) => {
  await handleCallback(req, res, "apple");
});

export default router;
