"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/authFeedback";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devResetToken, setDevResetToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setDevResetToken("");
    setLoading(true);

    try {
      const data = await api.forgotPassword(email.trim());
      setMessage(data.message || "If an account exists, reset instructions have been sent.");
      if (data.devResetToken) {
        setDevResetToken(data.devResetToken);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not process your request. Please try again."));
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
          <h1>Forgot your password?</h1>
          <p className="signup-copy">Enter your email and we will send password reset instructions.</p>

          <form className="signup-email-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </label>

            {error ? <p className="auth-error">{error}</p> : null}
            {message ? <p className="success-text">{message}</p> : null}

            <button type="submit" disabled={loading}>
              {loading ? "Please wait..." : "Send reset link"}
            </button>
          </form>

          {devResetToken ? (
            <div className="auth-warning">
              <p>Dev reset token (local only):</p>
              <code>{devResetToken}</code>
              <Link href={`/reset-password?token=${encodeURIComponent(devResetToken)}`}>
                Reset now
              </Link>
            </div>
          ) : null}

          <div className="signup-links">
            <Link href="/signup">Back to sign in</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
