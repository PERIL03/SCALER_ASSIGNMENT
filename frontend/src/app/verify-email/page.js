"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/authFeedback";

function getSafeNextPath(raw) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");

  const [message, setMessage] = useState("Checking your verification status...");
  const [error, setError] = useState("");
  const [devToken, setDevToken] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
    setNextPath(getSafeNextPath(params.get("next")));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setError("");

      try {
        if (token) {
          setBusy(true);
          await api.verifyEmailToken(token);
          setMessage("Email verified successfully. Redirecting...");
        }

        const { user } = await api.getCurrentUser();
        if (cancelled) return;

        if (!user.emailVerified) {
          setMessage("Your email is not verified yet. Use the button below to send a fresh link.");
          return;
        }

        if (!user.onboardingCompleted) {
          router.replace(`/onboarding?next=${encodeURIComponent(nextPath)}`);
          return;
        }

        router.replace(nextPath);
      } catch (err) {
        if (!cancelled) {
          setError(getAuthErrorMessage(err, "Could not verify your email yet."));
          setMessage("Verification is still pending.");
        }
      } finally {
        if (!cancelled) {
          setBusy(false);
        }
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [token, nextPath, router]);

  async function handleSendVerification() {
    setError("");
    setDevToken("");
    setBusy(true);

    try {
      const data = await api.sendVerification();
      setMessage(data.message || "Verification link sent. Check your inbox.");
      if (data.devVerificationToken) {
        setDevToken(data.devVerificationToken);
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not generate a verification link."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="signup-shell">
      <div className="signup-grid" aria-hidden="true" />
      <main className="signup-main">
        <section className="signup-card card">
          <p className="signup-eyebrow">Email verification</p>
          <h1>Verify your email to continue</h1>
          <p className="signup-copy">{message}</p>

          {error ? <p className="auth-error">{error}</p> : null}

          <div className="signup-auth-row verify-actions">
            <button type="button" onClick={handleSendVerification} disabled={busy}>
              {busy ? "Please wait..." : "Send verification email"}
            </button>
            <Link className="secondary-link" href="/signup">
              Back to sign in
            </Link>
          </div>

          {devToken ? (
            <div className="auth-warning">
              <p>Dev verification token (local only):</p>
              <code>{devToken}</code>
              <Link href={`/verify-email?token=${encodeURIComponent(devToken)}&next=${encodeURIComponent(nextPath)}`}>
                Verify now
              </Link>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
