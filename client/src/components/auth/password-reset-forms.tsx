import React, { useState } from "react";
import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import { api } from "@/lib/api";
import { PasswordInput } from "@/components/password-input";

const MIN_PASSWORD_LENGTH = 6;

const inputClass =
  "w-full bg-background border-2 border-border rounded-xl py-3 px-4 outline-none focus:border-primary transition-all text-foreground";
const primaryButtonClass =
  "w-full flex items-center justify-center gap-2 py-4 mt-2 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none transition-all";
const linkButtonClass =
  "flex w-full cursor-pointer items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm text-center font-medium"
    >
      {message}
    </div>
  );
}

/** Step 1: ask for the account email and send a reset link. */
export function ForgotPasswordForm({
  initialEmail,
  onBack,
}: {
  initialEmail: string;
  onBack: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSentTo(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset link.");
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <div className="space-y-5 text-center" data-testid="forgot-password-sent">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-7 w-7" />
        </div>
        <p className="text-foreground">
          If an account exists for <strong className="break-all">{sentTo}</strong>, we've sent a
          link to reset the password.
        </p>
        <p className="text-sm text-muted-foreground">
          It can take a minute to arrive, so check your spam folder too. The link works once and
          expires in 30 minutes.
        </p>
        <button type="button" onClick={onBack} className={linkButtonClass}>
          <ArrowLeft className="h-4 w-4" /> Back to log in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <ErrorBanner message={error} />}
      <div className="space-y-2">
        <label
          htmlFor="forgot-email"
          className="text-sm font-medium text-muted-foreground ml-1"
        >
          Email Address
        </label>
        <input
          id="forgot-email"
          type="email"
          autoFocus
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          data-testid="input-forgot-email"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={loading || !email.trim()}
        data-testid="button-send-reset-link"
        className={primaryButtonClass}
      >
        {loading ? (
          <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
        ) : (
          <>
            Send reset link <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
      <button type="button" onClick={onBack} className={linkButtonClass}>
        <ArrowLeft className="h-4 w-4" /> Back to log in
      </button>
    </form>
  );
}

/** Step 2: the person arrived from the email link and chooses a new password. */
export function ResetPasswordForm({
  token,
  onDone,
  onRequestNewLink,
}: {
  token: string;
  onDone: () => void;
  onRequestNewLink: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [linkProblem, setLinkProblem] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      onDone();
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(err instanceof Error ? err.message : "Could not reset your password.");
      // A 400 here means the link itself is bad (expired or already used), not the password.
      setLinkProblem(status === 400 && /link/i.test(String(err instanceof Error ? err.message : "")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && <ErrorBanner message={error} />}
      {linkProblem ? (
        <button
          type="button"
          onClick={onRequestNewLink}
          data-testid="button-request-new-link"
          className={primaryButtonClass}
        >
          Request a new link <ArrowRight className="w-5 h-5" />
        </button>
      ) : (
        <>
          <div className="space-y-2">
            <label
              htmlFor="reset-new-password"
              className="text-sm font-medium text-muted-foreground ml-1"
            >
              New password
            </label>
            <PasswordInput
              id="reset-new-password"
              autoFocus
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setError("");
              }}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              data-testid="input-reset-new-password"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="reset-confirm-password"
              className="text-sm font-medium text-muted-foreground ml-1"
            >
              Confirm new password
            </label>
            <PasswordInput
              id="reset-confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError("");
              }}
              placeholder="Re-enter your new password"
              data-testid="input-reset-confirm-password"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            data-testid="button-reset-password"
            className={primaryButtonClass}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                Reset password <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </>
      )}
    </form>
  );
}
