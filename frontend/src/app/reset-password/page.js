"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/authFeedback";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("This reset link is missing a valid token.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setMessage("Password reset successful. Redirecting to sign in...");
      setTimeout(() => router.replace("/signup"), 900);
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not reset password. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-shell">
      <div className="signup-grid" aria-hidden="true" />
      <main className="signup-main">
        <section className="signup-card card">
          <p className="signup-eyebrow">Account recovery</p>
          <h1>Reset password</h1>
          <p className="signup-copy">Create a new password for your account.</p>

          <form className="signup-email-form" onSubmit={handleSubmit}>
            <label>
              New password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>

            <label>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>

            {error ? <p className="auth-error">{error}</p> : null}
            {message ? <p className="success-text">{message}</p> : null}

            <button type="submit" disabled={loading}>
              {loading ? "Please wait..." : "Update password"}
            </button>
          </form>

          <div className="signup-links">
            <Link href="/signup">Back to sign in</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
