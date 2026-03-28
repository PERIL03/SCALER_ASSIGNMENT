import Link from "next/link";
import GoogleAuthControls from "@/components/GoogleAuthControls";
import EmailAuthForm from "@/components/EmailAuthForm";

export const metadata = {
  title: "Sign Up | cal.com Scheduler",
};

function getSafeRedirectPath(rawNext) {
  if (typeof rawNext !== "string") {
    return "/";
  }

  const trimmed = rawNext.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/";
  }

  return trimmed;
}

export default async function SignUpPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const redirectTo = getSafeRedirectPath(resolvedSearchParams?.next);
  const forceAdminAuth = resolvedSearchParams?.admin === "1";
  const requestedMode = resolvedSearchParams?.mode === "signin" ? "signin" : "signup";

  return (
    <div className="signup-shell">
      <div className="signup-grid" aria-hidden="true" />
      <main className="signup-main">
        <section className="signup-card card">
          <p className="signup-eyebrow">Get started</p>
          <h1>Create your scheduling workspace</h1>
          <p className="signup-copy">
            Continue with Google, or use email and password to set up your account.
          </p>

          {forceAdminAuth ? (
            <p className="auth-warning">Admin authentication required to access the admin panel.</p>
          ) : null}

          <div className="signup-auth-row">
            <GoogleAuthControls redirectTo={redirectTo} />
          </div>

          <div className="signup-divider" role="separator" aria-label="or" />

          <section className="signup-email-block" aria-label="Email sign up form">
            <h2>Email and password access</h2>
            <EmailAuthForm redirectTo={redirectTo} initialMode={requestedMode} />
          </section>

          <div className="signup-links">
            <Link href="/">Back to landing</Link>
            <Link href="/dashboard">Open dashboard</Link>
            <Link href="/forgot-password">Forgot password</Link>
            <Link href="/verify-email">Verify email</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
