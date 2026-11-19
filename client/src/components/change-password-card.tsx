import React, { useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { PasswordInput } from "@/components/password-input";

const MIN_PASSWORD_LENGTH = 6;

const inputClass =
  "w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground outline-none focus:border-primary transition-colors";

export function ChangePasswordCard() {
  const { changePassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const close = () => {
    reset();
    setOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a password that is different from your current one.");
      return;
    }

    setSaving(true);
    setError("");
    const result = await changePassword(currentPassword, newPassword);
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Could not change your password.");
      return;
    }
    toast.success("Password changed");
    close();
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">Password</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Change the password you use to sign in
          </p>
        </div>
        {!open && (
          <button
            type="button"
            data-testid="button-change-password"
            onClick={() => setOpen(true)}
            className="shrink-0 cursor-pointer rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            Change
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="current-password"
              className="text-sm font-medium text-muted-foreground"
            >
              Current password
            </label>
            <PasswordInput
              id="current-password"
              autoFocus
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter your current password"
              data-testid="input-current-password"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="new-password"
              className="text-sm font-medium text-muted-foreground"
            >
              New password
            </label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError("");
              }}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              data-testid="input-new-password"
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password"
              className="text-sm font-medium text-muted-foreground"
            >
              Confirm new password
            </label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              placeholder="Re-enter your new password"
              data-testid="input-confirm-password"
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className="flex-1 cursor-pointer rounded-xl bg-secondary px-4 py-2.5 font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="button-save-password"
              disabled={
                saving || !currentPassword || !newPassword || !confirmPassword
              }
              className="flex-1 cursor-pointer rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Change password"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
