import React, { useEffect, useState } from "react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { ArrowRight, Lock } from "lucide-react";
import { PasswordInput } from "@/components/password-input";
import {
  ForgotPasswordForm,
  ResetPasswordForm,
} from "@/components/auth/password-reset-forms";

type Mode = "login" | "forgot" | "reset";

const TITLES: Record<Mode, { title: string; subtitle: string; page: string }> = {
  login: {
    title: "Welcome Back",
    subtitle: "Sign in to access your private ledger.",
    page: "Log in",
  },
  forgot: {
    title: "Forgot password?",
    subtitle: "Enter your email and we'll send you a link to reset it.",
    page: "Forgot password",
  },
  reset: {
    title: "Choose a new password",
    subtitle: "Pick a new password for your account.",
    page: "Reset password",
  },
};
import { motion } from "framer-motion";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  usePageTitle(TITLES[mode].page);

  // The reset link in the email opens /login#reset=<token>. The token is kept in the
  // URL fragment (never sent to a server), read once, then removed from the address bar.
  useEffect(() => {
    const match = window.location.hash.match(/^#reset=([\w.-]+)$/);
    if (!match) return;
    setResetToken(match[1]);
    setMode("reset");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  const backToLogin = () => {
    setMode("login");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || "Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-lg bg-primary/5 blur-[150px] rounded-full pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-card border border-border rounded-3xl p-5 sm:p-8 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Lock className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-center">
            {TITLES[mode].title}
          </h1>
          <p className="text-muted-foreground mt-2 text-center">
            {TITLES[mode].subtitle}
          </p>
        </div>

        {mode === "login" && notice && (
          <div
            role="status"
            className="mb-6 p-4 bg-income/10 border border-income/20 text-income rounded-xl text-sm text-center font-medium"
          >
            {notice}
          </div>
        )}

        {mode === "login" && error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm text-center font-medium">
            {error}
          </div>
        )}

        {mode === "login" && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground ml-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border-2 border-border rounded-xl py-3 px-4 outline-none focus:border-primary transition-all text-foreground"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground ml-1">
              Password
            </label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border-2 border-border rounded-xl py-3 px-4 outline-none focus:border-primary transition-all text-foreground"
              required
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <div className="flex justify-end">
              <button
                type="button"
                data-testid="button-forgot-password"
                onClick={() => {
                  setError("");
                  setNotice("");
                  setMode("forgot");
                }}
                className="cursor-pointer text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 mt-2 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none transition-all"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                Log In <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
        )}

        {mode === "forgot" && (
          <ForgotPasswordForm initialEmail={email} onBack={backToLogin} />
        )}

        {mode === "reset" && resetToken && (
          <ResetPasswordForm
            token={resetToken}
            onDone={() => {
              setNotice("Password updated. Log in with your new password.");
              setPassword("");
              setResetToken(null);
              backToLogin();
            }}
            onRequestNewLink={() => setMode("forgot")}
          />
        )}

        {mode === "login" && (
          <p className="text-center mt-8 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-primary font-bold hover:underline"
            >
              Sign up free
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}