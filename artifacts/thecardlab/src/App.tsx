import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "sonner";
import { ClerkProvider, SignIn, useAuth } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { useEffect, Suspense, lazy } from "react";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { SignUpForm } from "@/components/auth/SignUpForm";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ModalRoot } from "@/components/modals/ModalRoot";
import SSOCallback from "@/pages/SSOCallback";
import SSOContinue from "@/pages/SSOContinue";
import { CurrencyProvider } from "@/hooks/useCurrency";

const NotFound     = lazy(() => import("@/pages/not-found"));
const Landing      = lazy(() => import("@/pages/Landing"));
const Dashboard    = lazy(() => import("@/pages/Dashboard"));
const DealScreener = lazy(() => import("@/pages/DealScreener"));
const GradeLab     = lazy(() => import("@/pages/GradeLab"));
const Portfolio    = lazy(() => import("@/pages/Portfolio"));
const Research     = lazy(() => import("@/pages/Research"));
const Marketplace  = lazy(() => import("@/pages/Marketplace"));
const Vault        = lazy(() => import("@/pages/Vault"));
const Shows        = lazy(() => import("@/pages/Shows"));
const Restoration  = lazy(() => import("@/pages/Restoration"));
const MobileApp    = lazy(() => import("@/pages/MobileApp"));
const GradingTracker = lazy(() => import("@/pages/GradingTracker"));
const Wantlist     = lazy(() => import("@/pages/Wantlist"));
const Privacy      = lazy(() => import("@/pages/Privacy"));
const Terms        = lazy(() => import("@/pages/Terms"));
const SupportPage  = lazy(() => import("@/pages/Support"));
const Pricing      = lazy(() => import("@/pages/Pricing"));
const Settings     = lazy(() => import("@/pages/Settings"));

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

// Wire api-client to the Fly.io API server
setBaseUrl(
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "https://api.thecardlab.app"
);

function ApiAuthSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(async () => {
      try { return await getToken(); } catch { return null; }
    });
    return () => { setAuthTokenGetter(null); };
  }, [getToken]);
  return null;
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  baseTheme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "none" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#00e5ff",
    colorForeground: "#e2e8f0",
    colorMutedForeground: "#64748b",
    colorDanger: "#ff4d61",
    colorBackground: "#0d1a31",
    colorInput: "#050914",
    colorInputForeground: "#e2e8f0",
    colorNeutral: "#1e3a5f",
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
    borderRadius: "14px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0d1a31] rounded-[22px] w-[440px] max-w-full overflow-hidden border border-[#1e3a5f]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-black tracking-tight",
    headerSubtitle: "text-[#64748b]",
    socialButtonsBlockButtonText: "text-[#e2e8f0] font-semibold",
    formFieldLabel: "text-[#94a3b8] text-xs font-bold uppercase tracking-wide",
    footerActionLink: "text-[#00e5ff] font-semibold",
    footerActionText: "text-[#64748b]",
    dividerText: "text-[#475569]",
    identityPreviewEditButton: "text-[#00e5ff]",
    formFieldSuccessText: "text-[#22d3a6]",
    alertText: "text-[#e2e8f0]",
    logoBox: { display: "none" },
    logoImage: { display: "none" },
    socialButtonsBlockButton: "!border !border-[#1e3a5f] !bg-[#050914] hover:!bg-[#0d1a31] !rounded-xl !font-semibold",
    formButtonPrimary: "!bg-[#00e5ff] !text-[#03111c] !font-black hover:!bg-[#22d3a6] !rounded-xl !shadow-[0_0_20px_rgba(0,229,255,0.3)]",
    formFieldInput: "!bg-[#050914] !border-[#1e3a5f] !text-[#e2e8f0] !rounded-xl",
    footerAction: "!bg-transparent",
    dividerLine: "!bg-[#1e3a5f]",
    alert: "!bg-[#050914] !border-[#1e3a5f]",
    otpCodeFieldInput: "!bg-[#050914] !border-[#1e3a5f] !text-white",
    formFieldRow: "",
    main: "",
  },
};

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-[#050914] px-4 overflow-hidden">
      {/* Atmospheric glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-[#00e5ff]/[0.04] blur-[120px]" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[#7c3aed]/[0.05] blur-[90px]" />
      </div>
      {/* Grid lines */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(#00e5ff 1px, transparent 1px), linear-gradient(90deg, #00e5ff 1px, transparent 1px)", backgroundSize: "60px 60px" }}
      />
      <div className="relative z-10 flex flex-col items-center gap-8 w-full">
        <a href={basePath || "/"} className="flex items-center group opacity-90 hover:opacity-100 transition-opacity">
          <img src={`${window.location.origin}${basePath}/logo.svg`} alt="TheCardLab" className="h-8 w-auto" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        </a>
        {children}
        <p className="text-xs text-[#475569] text-center">AI-powered sports card intelligence</p>
      </div>
    </div>
  );
}

function SignInPage() {
  usePageMeta("Sign In — TheCardLab", "Sign in to TheCardLab — AI-powered sports card analytics.");
  return (
    <AuthShell>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/dashboard`}
      />
    </AuthShell>
  );
}

function SignUpPage() {
  usePageMeta("Create Account — TheCardLab", "Join TheCardLab — AI-powered sports card grading, deal screening, and portfolio analytics.");
  return (
    <AuthShell>
      <SignUpForm
        signInUrl={`${basePath}/sign-in`}
        redirectUrl={`${basePath}/dashboard`}
      />
    </AuthShell>
  );
}

function Router() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#050914]" />}>
    <Switch>
      {/* Public */}
      <Route path="/" component={Landing} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/sso-callback" component={SSOCallback} />
      <Route path="/sso-continue" component={SSOContinue} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/support" component={SupportPage} />
      <Route path="/pricing" component={Pricing} />

      {/* Protected app routes */}
      <Route path="/dashboard">{() => <ProtectedRoute component={Dashboard} />}</Route>
      <Route path="/deal-screener">{() => <ProtectedRoute component={DealScreener} />}</Route>
      <Route path="/grade-lab">{() => <ProtectedRoute component={GradeLab} />}</Route>
      <Route path="/portfolio">{() => <ProtectedRoute component={Portfolio} />}</Route>
      <Route path="/research">{() => <ProtectedRoute component={Research} />}</Route>
      <Route path="/marketplace">{() => <ProtectedRoute component={Marketplace} />}</Route>
      <Route path="/vault">{() => <ProtectedRoute component={Vault} />}</Route>
      <Route path="/shows">{() => <ProtectedRoute component={Shows} />}</Route>
      <Route path="/restoration">{() => <ProtectedRoute component={Restoration} />}</Route>
      <Route path="/mobile-app">{() => <ProtectedRoute component={MobileApp} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={Settings} />}</Route>
      <Route path="/grading-tracker">{() => <ProtectedRoute component={GradingTracker} />}</Route>
      <Route path="/wantlist">{() => <ProtectedRoute component={Wantlist} />}</Route>

      <Route path="/market">{() => <ProtectedRoute component={Research} />}</Route>
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/dashboard`}
      signUpFallbackRedirectUrl={`${basePath}/dashboard`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to TheCardLab",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Join TheCardLab — AI-powered card intelligence",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ApiAuthSync />
      <CurrencyProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Router />
            <ModalRoot />
          </TooltipProvider>
          <Toaster />
          <Sonner theme="dark" position="bottom-center" />
        </QueryClientProvider>
      </CurrencyProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
