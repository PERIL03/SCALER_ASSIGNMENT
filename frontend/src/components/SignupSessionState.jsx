"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/authFeedback";

export default function SignupSessionState({ forceAdminAuth, redirectTo, children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const data = await api.getCurrentUser();
        if (!cancelled) {
          setUser(data?.user || null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!forceAdminAuth || !user?.isAdmin) {
      return;
    }

    router.replace(redirectTo || "/dashboard");
  }, [forceAdminAuth, redirectTo, router, user]);

  async function handleSwitchAccount() {
    setError("");
    try {
      await api.logout();
      setUser(null);
      router.replace(`/signup?next=${encodeURIComponent(redirectTo || "/dashboard")}&admin=1&mode=signin`);
      router.refresh();
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not switch account. Please try again."));
    }
  }

  if (loading) {
    return children;
  }

  if (!user) {
    return children;
  }

  if (!forceAdminAuth) {
    return (
      <section className="signup-session-panel" aria-live="polite">
        <h2>You are already signed in</h2>
        <p className="signup-copy">Continue with your existing account or switch account.</p>
        <p className="signup-session-user">
          Signed in as <strong>{user.name || user.email}</strong> ({user.email})
        </p>
        <div className="signup-session-actions">
          <Link className="topbar-switch-link" href="/book/intro-call">
            Continue to user view
          </Link>
          <Link className="topbar-new-btn" href="/dashboard">
            Open dashboard
          </Link>
          <button type="button" className="secondary-btn" onClick={handleSwitchAccount}>
            Switch account
          </button>
        </div>
        {error ? <p className="auth-error">{error}</p> : null}
      </section>
    );
  }

  if (user.isAdmin) {
    return (
      <section className="signup-session-panel" aria-live="polite">
        <h2>Redirecting to admin panel...</h2>
        <p className="signup-copy">Your admin account is already authenticated.</p>
      </section>
    );
  }

  return (
    <section className="signup-session-panel" aria-live="polite">
      <h2>You are signed in as a regular user</h2>
      <p className="signup-copy">
        Admin panel access needs an admin account. You can continue to user view or switch accounts.
      </p>
      <p className="signup-session-user">
        Current account: <strong>{user.name || user.email}</strong> ({user.email})
      </p>
      <div className="signup-session-actions">
        <Link className="topbar-switch-link" href="/book/intro-call?notice=admin-only">
          Continue to user view
        </Link>
        <button type="button" className="secondary-btn" onClick={handleSwitchAccount}>
          Switch account
        </button>
      </div>
      {error ? <p className="auth-error">{error}</p> : null}
    </section>
  );
}
