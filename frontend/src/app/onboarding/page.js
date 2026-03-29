"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/authFeedback";
import { showToast } from "@/lib/toast";

function getSafeNextPath(raw) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState("/dashboard");

  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(getSafeNextPath(params.get("next")));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.completeOnboarding({ timezone });
      showToast("Workspace setup complete.", "success");
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not finish setup. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-shell">
      <div className="signup-grid" aria-hidden="true" />
      <main className="signup-main">
        <section className="signup-card card">
          <p className="signup-eyebrow">Welcome</p>
          <h1>Finish setting up your workspace</h1>
          <p className="signup-copy">
            We will create your initial availability schedule and a starter intro event.
          </p>

          <form className="signup-email-form" onSubmit={handleSubmit}>
            <label>
              Timezone
              <input
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="Asia/Kolkata"
                required
              />
            </label>

            {error ? <p className="auth-error">{error}</p> : null}

            <button type="submit" disabled={loading}>
              {loading ? "Setting up..." : "Finish setup"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
