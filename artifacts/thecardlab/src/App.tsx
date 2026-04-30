import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "sonner";
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

const queryClient = new QueryClient();

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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
        <Sonner theme="dark" position="bottom-center" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
