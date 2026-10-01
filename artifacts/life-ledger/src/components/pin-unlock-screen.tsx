import React, { useState } from "react";
import { LockKeyhole, LogOut } from "lucide-react";
import { PinDigitBoxes } from "@/components/pin-digit-boxes";
import { useAuth } from "@/contexts/auth-context";
import { usePinLock } from "@/contexts/pin-lock-context";

export function PinUnlockScreen() {
  const { logout } = useAuth();
  const { pinLength, statusError, verifyAndUnlock, recoverWithPassword } =
    usePinLock();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pinLength || statusError) return;

    setChecking(true);
    setError("");
    try {
      const unlocked = await verifyAndUnlock(pin);
      if (!unlocked) {
        setError("That PIN is not correct. Try again.");
        setPin("");
      }
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Unable to verify the PIN. Please try again.",
      );
    } finally {
      setChecking(false);
    }
  };

  const handleRecovery = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecking(true);
    setError("");
    try {
      const result = await recoverWithPassword(password);
      if (!result.success) {
        setError(result.error ?? "Unable to verify your account password.");
        setPassword("");
      }
    } catch {
      setError("Unable to verify your account password. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <LockKeyhole className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {statusError ? "PIN lock unavailable" : "Unlock your ledger"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          {showRecovery
            ? "Verify your account password to remove your account PIN."
            : statusError ||
              `Enter your ${pinLength ?? ""}-digit PIN to continue.`}
        </p>

        <div className="flex justify-center items-center">
          {!showRecovery && !statusError && pinLength && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <PinDigitBoxes
                value={pin}
                onChange={(value) => {
                  setPin(value);
                  setError("");
                }}
                length={pinLength}
                label="PIN"
                testId="input-unlock-pin"
                autoFocus
                disabled={checking}
              />
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={pin.length !== pinLength || checking}
                data-testid="button-unlock-ledger"
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold disabled:opacity-50 transition-opacity"
              >
                {checking ? "Checking…" : "Unlock"}
              </button>
            </form>
          )}
        </div>

        {showRecovery && (
          <form onSubmit={handleRecovery} className="space-y-4">
            <input
              autoFocus
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              aria-label="Account password"
              data-testid="input-pin-recovery-password"
              placeholder="Account password"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={!password || checking}
              data-testid="button-recover-pin"
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold disabled:opacity-50 transition-opacity"
            >
              {checking ? "Verifying…" : "Verify password and remove PIN"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRecovery(false);
                setPassword("");
                setError("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Back to PIN entry
            </button>
          </form>
        )}

        {!showRecovery && (
          <>
            <button
              type="button"
              onClick={() => {
                setShowRecovery(true);
                setPin("");
                setError("");
              }}
              data-testid="button-forgot-pin"
              className="mt-4 text-sm text-primary hover:underline"
            >
              Forgot PIN?
            </button>
          </>
        )}

        <button
          type="button"
          onClick={logout}
          data-testid="button-logout-from-pin"
          className="mt-5 ml-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </section>
    </main>
  );
}
