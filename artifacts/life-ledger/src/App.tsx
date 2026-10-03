import React from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { AuthProvider, useAuth } from "./contexts/auth-context";
import { ThemeProvider } from "./contexts/theme-context";
import { DataProvider } from "./contexts/data-context";
import { PinLockProvider, usePinLock } from "./contexts/pin-lock-context";
import { PinUnlockScreen } from "./components/pin-unlock-screen";
import { Toaster } from "./components/ui/sonner";

import Landing from "./pages/landing";
import Login from "./pages/login";
import Register from "./pages/register";
import Dashboard from "./pages/dashboard";
import Transactions from "./pages/transactions";
import Analytics from "./pages/analytics";
import Budgets from "./pages/budgets";
import Settings from "./pages/settings";
import NotFound from "./pages/not-found";

function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { user, loading } = useAuth();
  const { ready, isLocked } = usePinLock();
  if (loading)
    return (
      <div className="min-h-screen bg-background flex flex-col gap-3 items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm animate-pulse text-gray-100">Loading...</p>
      </div>
    );
  if (!user) return <Redirect to="/login" />;
  if (!ready)
    return (
      <div className="min-h-screen bg-background flex flex-col gap-3 items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm animate-pulse text-gray-100">Loading...</p>
      </div>
    );
  if (isLocked) return <PinUnlockScreen />;
  return <Component />;
}

function PublicRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen bg-background flex flex-col gap-3 items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm animate-pulse text-gray-100">Loading...</p>
      </div>
    );
  if (user) return <Redirect to="/dashboard" />;
  return <Component />;
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={() => <PublicRoute component={Landing} />} />
      <Route
        path="/login"
        component={() => <PublicRoute component={Login} />}
      />
      <Route
        path="/register"
        component={() => <PublicRoute component={Register} />}
      />

      <Route
        path="/dashboard"
        component={() => <ProtectedRoute component={Dashboard} />}
      />
      <Route
        path="/transactions"
        component={() => <ProtectedRoute component={Transactions} />}
      />
      <Route
        path="/analytics"
        component={() => <ProtectedRoute component={Analytics} />}
      />
      <Route
        path="/budgets"
        component={() => <ProtectedRoute component={Budgets} />}
      />
      <Route
        path="/settings"
        component={() => <ProtectedRoute component={Settings} />}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <PinLockProvider>
        <ThemeProvider>
          <DataProvider>
            <Toaster />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Routes />
            </WouterRouter>
          </DataProvider>
        </ThemeProvider>
      </PinLockProvider>
    </AuthProvider>
  );
}

export default App;