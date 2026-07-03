import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

router.post("/auth/signup", async (req, res) => {
  const { firstName, lastName, username, email, password } = req.body as {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: "Server misconfigured" });
    return;
  }

  try {
    // Create user via BAPI — email is automatically verified server-side
    const createRes = await fetch("https://api.clerk.com/v1/users", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: [email],
        password,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        username: username || undefined,
        skip_password_checks: false,
      }),
    });

    const userData = await createRes.json() as { id?: string; errors?: Array<{ long_message?: string; message?: string }> };

    if (!createRes.ok || !userData.id) {
      const msg = userData.errors?.[0]?.long_message ?? userData.errors?.[0]?.message ?? "Sign up failed";
      res.status(400).json({ error: msg });
      return;
    }

    // Issue a short-lived sign-in token so the frontend can create a session
    const tokenRes = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userData.id, expires_in_seconds: 120 }),
    });

    const tokenData = await tokenRes.json() as { token?: string; errors?: Array<{ message?: string }> };

    if (!tokenRes.ok || !tokenData.token) {
      logger.error({ userId: userData.id }, "Failed to create sign-in token after signup");
      res.status(500).json({ error: "Account created but login failed. Please sign in manually." });
      return;
    }

    res.json({ token: tokenData.token });
  } catch (err) {
    logger.error({ err }, "Signup error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
