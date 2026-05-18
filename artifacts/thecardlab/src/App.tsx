import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "sonner";
import { ClerkProvider, SignIn, SignUp } from "@clerk/react";
import { shadcn } from "@clerk/themes";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import DealScreener from "@/pages/DealScreener";
import GradeLab from "@/pages/GradeLab";
import Portfolio from "@/pages/Portfolio";
import Research from "@/pages/Research";
import Marketplace from "@/pages/Marketplace";
import Vault from "@/pages/Vault";
import Shows from "@/pages/Shows";
import Restoration from "@/pages/Restoration";
import MobileApp from "@/pages/MobileApp";
import GradingTracker from "@/pages/GradingTracker";
import Wantlist from "@/pages/Wantlist";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import SupportPage from "@/pages/Support";
import Pricing from "@/pages/Pricing";
import { ModalRoot } from "@/components/modals/ModalRoot";

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  baseTheme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
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
    logoBox: "mb-2",
    logoImage: "h-8 w-auto",
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

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050914] px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        forceRedirectUrl={`${basePath}/`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050914] px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        forceRedirectUrl={`${basePath}/`}
      />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/deal-screener" component={DealScreener} />
      <Route path="/grade-lab" component={GradeLab} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/research" component={Research} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/vault" component={Vault} />
      <Route path="/shows" component={Shows} />
      <Route path="/restoration" component={Restoration} />
      <Route path="/mobile-app" component={MobileApp} />
      <Route path="/grading-tracker" component={GradingTracker} />
      <Route path="/wantlist" component={Wantlist} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/support" component={SupportPage} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route component={NotFound} />
    </Switch>
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
      signInFallbackRedirectUrl={`${basePath}/`}
      signUpFallbackRedirectUrl={`${basePath}/`}
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
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <ModalRoot />
        </TooltipProvider>
        <Toaster />
        <Sonner theme="dark" position="bottom-center" />
      </QueryClientProvider>
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
