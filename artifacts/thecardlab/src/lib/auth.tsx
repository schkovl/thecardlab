/**
 * First-party auth layer backed by the API's cookie sessions
 * (`/api/auth/signup|signin|signout|me` + `/api/auth/oauth/*`).
 *
 * Exposes Clerk-compatible hook shapes (useAuth / useUser / useClerk) so
 * pages that only read auth state don't need structural changes.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  /** Derived from email local-part; kept for Clerk-era call sites. */
  username: string | null;
  imageUrl: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface ApiUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl?: string | null;
}

function toAuthUser(u: ApiUser): AuthUser {
  const email = u.email ?? null;
  return {
    id: u.id,
    email,
    firstName: u.firstName ?? null,
    lastName: u.lastName ?? null,
    username: email ? email.split("@")[0] : null,
    imageUrl: u.imageUrl ?? null,
    primaryEmailAddress: email ? { emailAddress: email } : null,
  };
}

async function postJson(
  path: string,
  body: unknown,
): Promise<{ user: ApiUser }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    user?: ApiUser;
    error?: string;
  };
  if (!res.ok || !data.user) {
    throw new Error(data.error ?? "Request failed");
  }
  return { user: data.user };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { user?: ApiUser };
        setUser(data.user ? toAuthUser(data.user) : null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: u } = await postJson("/api/auth/signin", { email, password });
    setUser(toAuthUser(u));
  }, []);

  const signUp = useCallback(
    async (input: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }) => {
      const { user: u } = await postJson("/api/auth/signup", input);
      setUser(toAuthUser(u));
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoaded,
      isSignedIn: user !== null,
      signIn,
      signUp,
      signOut,
      refresh,
    }),
    [user, isLoaded, signIn, signUp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("Auth hooks must be used inside <AuthProvider>");
  }
  return ctx;
}

/** Clerk-compatible signOut: optionally redirects after the session ends. */
function useCompatSignOut() {
  const { signOut } = useAuthContext();
  return useCallback(
    async (options?: { redirectUrl?: string }) => {
      await signOut();
      if (options?.redirectUrl) {
        window.location.assign(options.redirectUrl);
      }
    },
    [signOut],
  );
}

/** Clerk-compatible: `const { isSignedIn, isLoaded, getToken, signOut } = useAuth()` */
export function useAuth() {
  const { isSignedIn, isLoaded } = useAuthContext();
  const signOut = useCompatSignOut();
  // Sessions ride the httpOnly cookie; there is no bearer token to hand out.
  const getToken = useCallback(async (): Promise<string | null> => null, []);
  return { isSignedIn, isLoaded, getToken, signOut };
}

/** Clerk-compatible: `const { user, isLoaded, isSignedIn } = useUser()` */
export function useUser() {
  const { user, isLoaded, isSignedIn } = useAuthContext();
  return { user, isLoaded, isSignedIn };
}

/** Clerk-compatible: `const { signOut } = useClerk()` */
export function useClerk() {
  const signOut = useCompatSignOut();
  return { signOut };
}

/** Form-facing API for SignInForm / SignUpForm. */
export function useAuthActions() {
  const { signIn, signUp, refresh } = useAuthContext();
  return { signIn, signUp, refresh };
}

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");

interface AuthButtonProps {
  children: ReactNode;
  /** Accepted for Clerk-era call sites; navigation is always a redirect. */
  mode?: string;
  forceRedirectUrl?: string;
}

function navButton(target: string, { children }: AuthButtonProps) {
  return (
    <span
      style={{ display: "contents" }}
      onClick={() => window.location.assign(target)}
    >
      {children}
    </span>
  );
}

/** Clerk-compatible: wraps its child and sends clicks to the sign-in page. */
export function SignInButton(props: AuthButtonProps) {
  return navButton(`${BASE_PATH}/sign-in`, props);
}

/** Clerk-compatible: wraps its child and sends clicks to the sign-up page. */
export function SignUpButton(props: AuthButtonProps) {
  return navButton(`${BASE_PATH}/sign-up`, props);
}

export interface OAuthProvider {
  id: string;
  label: string;
  configured: boolean;
}

export async function fetchOAuthProviders(): Promise<OAuthProvider[]> {
  const res = await fetch("/api/auth/oauth/providers", {
    credentials: "include",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { providers?: OAuthProvider[] };
  return data.providers ?? [];
}

/** Full-page redirect into the server-side OAuth flow. */
export function startOAuth(providerId: string, redirectTo = "/"): void {
  const params = new URLSearchParams({ redirect: redirectTo });
  window.location.assign(
    `/api/auth/oauth/${encodeURIComponent(providerId)}/start?${params}`,
  );
}
