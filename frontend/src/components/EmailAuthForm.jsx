"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/authFeedback";

const INITIAL_FORM = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const ADMIN_EMAIL = "admin@calclone.dev";
const ADMIN_PASSWORD = "Admin@1234";

function getPasswordChecks(password) {
  return [
    { label: "At least 8 characters", passed: password.length >= 8 },
    { label: "One uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "One lowercase letter", passed: /[a-z]/.test(password) },
    { label: "One number", passed: /\d/.test(password) },
    { label: "One special character", passed: /[^A-Za-z0-9]/.test(password) },
  ];
}

function getPasswordStrength(score) {
  if (score <= 1) return { label: "Weak", className: "password-strength-weak" };
  if (score <= 3) return { label: "Medium", className: "password-strength-medium" };
  return { label: "Strong", className: "password-strength-strong" };
}

export default function EmailAuthForm({ redirectTo = "/dashboard" }) {
  const router = useRouter();
  const [mode, setMode] = useState("signup");
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (mode === "signup" && form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const data = await api.emailSignUp({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });

        const verificationQuery = new URLSearchParams({
          next: redirectTo,
          ...(data?.devVerificationToken
            ? { token: data.devVerificationToken }
            : {}),
        });
        router.push(`/verify-email?${verificationQuery.toString()}`);
        router.refresh();
        return;
      } else {
        await api.emailSignIn({
          email: form.email.trim(),
          password: form.password,
        });

        try {
          const data = await api.getCurrentUser();
          if (!data.user?.emailVerified) {
            router.push(`/verify-email?next=${encodeURIComponent(redirectTo)}`);
            router.refresh();
            return;
          }
        } catch {
          // The route guard will handle edge cases.
        }
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(getAuthErrorMessage(err, "Authentication failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";
  const passwordChecks = getPasswordChecks(form.password);
  const passwordScore = passwordChecks.filter((item) => item.passed).length;
  const strength = getPasswordStrength(passwordScore);
  const showPasswordFeedback = isSignup && form.password.length > 0;
  const hasConfirmMismatch =
    isSignup && form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  return (
    <form className="signup-email-form" onSubmit={handleSubmit}>
      <div className="signup-mode-row" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          className={`signup-mode-btn ${isSignup ? "signup-mode-btn-active" : ""}`}
          onClick={() => {
            setMode("signup");
            setError("");
          }}
          role="tab"
          aria-selected={isSignup}
        >
          Create account
        </button>
        <button
          type="button"
          className={`signup-mode-btn ${!isSignup ? "signup-mode-btn-active" : ""}`}
          onClick={() => {
            setMode("signin");
            setError("");
          }}
          role="tab"
          aria-selected={!isSignup}
        >
          Sign in
        </button>
      </div>

      {!isSignup ? (
        <button
          type="button"
          className="admin-quickfill-btn"
          onClick={() => {
            setForm((prev) => ({
              ...prev,
              email: ADMIN_EMAIL,
              password: ADMIN_PASSWORD,
            }));
            setError("");
          }}
        >
          Use admin credentials
        </button>
      ) : null}

      <div className="signup-form-grid">
        {isSignup ? (
          <label>
            Full name
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </label>
        ) : null}

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <div className="password-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="At least 8 characters"
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={8}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        {showPasswordFeedback ? (
          <div className="password-strength" aria-live="polite">
            <div className="password-strength-head">
              <span>Password strength</span>
              <strong className={strength.className}>{strength.label}</strong>
            </div>
            <div className="password-meter" role="presentation">
              <span
                className={`password-meter-fill ${strength.className}`}
                style={{ width: `${(passwordScore / passwordChecks.length) * 100}%` }}
              />
            </div>
            <ul className="password-rules">
              {passwordChecks.map((item) => (
                <li key={item.label} className={item.passed ? "rule-pass" : "rule-pending"}>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {isSignup ? (
          <label>
            Confirm password
            <div className="password-input-wrap">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
        ) : null}
      </div>

      {hasConfirmMismatch ? (
        <p className="auth-error">Passwords do not match.</p>
      ) : null}

      {error ? <p className="auth-error">{error}</p> : null}

      <button type="submit" disabled={loading}>
        {loading
          ? "Please wait..."
          : isSignup
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="signup-inline-note">
        {isSignup
          ? "Prefer not to use Google? You can sign up fully with email and password."
          : `Use the email and password you created during sign up. Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`}
      </p>

      {!isSignup ? (
        <Link className="secondary-link" href="/forgot-password">
          Forgot password?
        </Link>
      ) : null}
    </form>
  );
}
