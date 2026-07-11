import { Google, Facebook, Apple, MicrosoftEntraId } from "arctic";

export type ProviderId = "google" | "facebook" | "apple" | "microsoft";

export type OAuthProviderConfig = {
  id: ProviderId;
  label: string;
  configured: boolean;
};

function publicBaseUrl(): string {
  return process.env.PUBLIC_BASE_URL ?? "http://localhost:5173";
}

function callbackUrl(provider: ProviderId): string {
  return `${publicBaseUrl()}/api/auth/oauth/${provider}/callback`;
}

function decodePkcs8Pem(pem: string): Uint8Array {
  const stripped = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  return Uint8Array.from(Buffer.from(stripped, "base64"));
}

export function getGoogle(): Google | null {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) return null;
  return new Google(id, secret, callbackUrl("google"));
}

export function getFacebook(): Facebook | null {
  const id = process.env.FACEBOOK_CLIENT_ID;
  const secret = process.env.FACEBOOK_CLIENT_SECRET;
  if (!id || !secret) return null;
  return new Facebook(id, secret, callbackUrl("facebook"));
}

export function getMicrosoft(): MicrosoftEntraId | null {
  const id = process.env.MICROSOFT_CLIENT_ID;
  const secret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenant = process.env.MICROSOFT_TENANT ?? "common";
  if (!id || !secret) return null;
  return new MicrosoftEntraId(tenant, id, secret, callbackUrl("microsoft"));
}

export function getApple(): Apple | null {
  const clientId = process.env.APPLE_CLIENT_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKeyPem = process.env.APPLE_PRIVATE_KEY;
  if (!clientId || !teamId || !keyId || !privateKeyPem) return null;
  const pkcs8 = decodePkcs8Pem(privateKeyPem);
  return new Apple(clientId, teamId, keyId, pkcs8, callbackUrl("apple"));
}

export function listProviders(): OAuthProviderConfig[] {
  return [
    { id: "google", label: "Google", configured: !!getGoogle() },
    { id: "apple", label: "Apple", configured: !!getApple() },
    { id: "facebook", label: "Facebook", configured: !!getFacebook() },
    { id: "microsoft", label: "Microsoft", configured: !!getMicrosoft() },
  ];
}

export type OAuthUserInfo = {
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

export async function fetchGoogleUserInfo(accessToken: string): Promise<OAuthUserInfo> {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`google userinfo failed: ${res.status}`);
  const j = (await res.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };
  return {
    providerUserId: j.sub,
    email: j.email ?? null,
    emailVerified: j.email_verified === true,
    firstName: j.given_name ?? null,
    lastName: j.family_name ?? null,
    imageUrl: j.picture ?? null,
  };
}

export async function fetchFacebookUserInfo(accessToken: string): Promise<OAuthUserInfo> {
  const url = `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`facebook userinfo failed: ${res.status}`);
  const j = (await res.json()) as {
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    picture?: { data?: { url?: string } };
  };
  return {
    providerUserId: j.id,
    email: j.email ?? null,
    emailVerified: false,
    firstName: j.first_name ?? null,
    lastName: j.last_name ?? null,
    imageUrl: j.picture?.data?.url ?? null,
  };
}

export async function fetchMicrosoftUserInfo(accessToken: string): Promise<OAuthUserInfo> {
  const res = await fetch("https://graph.microsoft.com/oidc/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`microsoft userinfo failed: ${res.status}`);
  const j = (await res.json()) as {
    sub: string;
    email?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  };
  return {
    providerUserId: j.sub,
    email: j.email ?? null,
    emailVerified: j.email != null,
    firstName: j.given_name ?? null,
    lastName: j.family_name ?? null,
    imageUrl: j.picture ?? null,
  };
}

function decodeJwtPayload<T = Record<string, unknown>>(jwt: string): T {
  const [, payload] = jwt.split(".");
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as T;
}

export function parseAppleIdToken(idToken: string, formUser?: string | null): OAuthUserInfo {
  const claims = decodeJwtPayload<{ sub: string; email?: string; email_verified?: string | boolean }>(idToken);
  let firstName: string | null = null;
  let lastName: string | null = null;
  if (formUser) {
    try {
      const u = JSON.parse(formUser) as { name?: { firstName?: string; lastName?: string } };
      firstName = u.name?.firstName ?? null;
      lastName = u.name?.lastName ?? null;
    } catch {
      // ignore
    }
  }
  const verified = claims.email_verified === true || claims.email_verified === "true";
  return {
    providerUserId: claims.sub,
    email: claims.email ?? null,
    emailVerified: verified,
    firstName,
    lastName,
    imageUrl: null,
  };
}
