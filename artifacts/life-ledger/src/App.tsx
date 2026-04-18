import React from 'react';
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { AuthProvider, useAuth } from './contexts/auth-context';
import { ThemeProvider } from './contexts/theme-context';
import { DataProvider } from './contexts/data-context';

import Landing from './pages/landing';
import Login from './pages/login';
import Register from './pages/register';
import Dashboard from './pages/dashboard';
import Transactions from './pages/transactions';
import Analytics from './pages/analytics';
import Budgets from './pages/budgets';
import Settings from './pages/settings';

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (user) return <Redirect to="/dashboard" />;
  return <Component />;
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={() => <PublicRoute component={Landing} />} />
      <Route path="/login" component={() => <PublicRoute component={Login} />} />
      <Route path="/register" component={() => <PublicRoute component={Register} />} />

      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/transactions" component={() => <ProtectedRoute component={Transactions} />} />
      <Route path="/analytics" component={() => <ProtectedRoute component={Analytics} />} />
      <Route path="/budgets" component={() => <ProtectedRoute component={Budgets} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />

      <Route>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">404</h1>
            <p className="text-muted-foreground mb-4">Page not found</p>
            <a href="/" className="text-primary hover:underline">Go Home</a>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DataProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Routes />
          </WouterRouter>
        </DataProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
