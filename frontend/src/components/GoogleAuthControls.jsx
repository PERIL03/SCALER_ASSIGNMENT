"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAuthErrorMessage } from "@/lib/authFeedback";
import { showToast } from "@/lib/toast";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const CREDENTIAL_EVENT = "cal-google-credential";

function getInitial(nameOrEmail) {
  if (!nameOrEmail) return "U";
  return String(nameOrEmail).trim().charAt(0).toUpperCase();
}

export default function GoogleAuthControls({
  compact = false,
  redirectTo = "/dashboard",
  requireAdmin = false,
  signedOutHref = "",
  signedOutLabel = "",
}) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [readyForButton, setReadyForButton] = useState(false);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState(false);
  const buttonContainerRef = useRef(null);
  const dropdownRef = useRef(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    async function handleCredential(event) {
      const credential = event?.detail?.credential;
      if (!credential) return;

      try {
        setError("");
        await api.googleSignIn(credential);

        let currentUser = null;
        try {
          const me = await api.getCurrentUser();
          currentUser = me.user || null;
        } catch {
          // If auth/me fails here, fallback redirect below remains unchanged.
        }

        if (currentUser) {
          setUser(currentUser);
          if (requireAdmin && !currentUser.isAdmin) {
            showToast("Signed in as user account. Admin panel requires an admin account.", "info");
            router.push("/book/intro-call?notice=admin-only");
            router.refresh();
            return;
          }
        }

        showToast("Signed in successfully.", "success");
        router.push(redirectTo);
        router.refresh();
      } catch (err) {
        setError(getAuthErrorMessage(err, "Google sign-in failed. Please try again."));
      }
    }

    window.addEventListener(CREDENTIAL_EVENT, handleCredential);
    return () => window.removeEventListener(CREDENTIAL_EVENT, handleCredential);
  }, [redirectTo, requireAdmin, router]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    function handlePointerDown(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setOpenMenu(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpenMenu(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!user) {
      setOpenMenu(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const data = await api.getCurrentUser();
        if (!cancelled) {
          setUser(data.user);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setReadyForButton(true);
        }
      }
    }

    loadCurrentUser();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!readyForButton || user || !clientId || !buttonContainerRef.current) {
      return;
    }

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !buttonContainerRef.current) {
        return;
      }

      if (!window.__calGoogleInitialized) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            window.dispatchEvent(
              new CustomEvent(CREDENTIAL_EVENT, {
                detail: { credential },
              })
            );
          },
        });
        window.__calGoogleInitialized = true;
      }

      buttonContainerRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonContainerRef.current, {
        type: "standard",
        shape: "pill",
        size: compact ? "medium" : "large",
        theme: "outline",
        text: "signin_with",
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [readyForButton, user, clientId, compact]);

  async function handleLogout() {
    try {
      await api.logout();
      setUser(null);
      setError("");
      setOpenMenu(false);
      if (window.google?.accounts?.id) {
        window.google.accounts.id.disableAutoSelect();
      }
      showToast("Logged out.", "info");
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not log out. Please try again."));
    }
  }

  if (!clientId) {
    return (
      <div className="auth-inline auth-warning">
        <span>Add NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend/.env</span>
      </div>
    );
  }

  if (user) {
    if (compact) {
      return (
        <div className="auth-dropdown" ref={dropdownRef}>
          <button
            type="button"
            className="auth-dropdown-trigger"
            onClick={() => setOpenMenu((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={openMenu}
            aria-label="Open profile menu"
          >
            <span className="auth-avatar">{getInitial(user.name || user.email)}</span>
            <span className="auth-pill-name">{user.name || user.email}</span>
            <span className="auth-dropdown-caret" aria-hidden="true">
              v
            </span>
          </button>

          {openMenu ? (
            <div className="auth-dropdown-menu" role="menu">
              <div className="auth-dropdown-head">
                <strong>{user.name || "Account"}</strong>
                <small>{user.email}</small>
              </div>

              <span className={user.isAdmin ? "auth-role-badge auth-role-badge-admin" : "auth-role-badge"}>
                {user.isAdmin ? "Admin" : "User"}
              </span>

              <div className="auth-dropdown-links">
                {user.isAdmin ? (
                  <Link href="/book/intro-call" role="menuitem">
                    Switch to user view
                  </Link>
                ) : (
                  <>
                    <Link href="/book/intro-call" role="menuitem">
                      Open user booking page
                    </Link>
                    <Link href="/signup?next=/dashboard&admin=1&mode=signin" role="menuitem">
                      Switch to admin panel
                    </Link>
                  </>
                )}
              </div>

              <button type="button" className="auth-logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="auth-inline">
        <span className="auth-avatar">{getInitial(user.name || user.email)}</span>
        <div className="auth-user-text">
          <strong>{user.name}</strong>
          {!compact && <small>{user.email}</small>}
        </div>
        <span className={user.isAdmin ? "auth-role-badge auth-role-badge-admin" : "auth-role-badge"}>
          {user.isAdmin ? "Admin" : "User"}
        </span>
        <button type="button" className="auth-logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    );
  }

  if (compact && signedOutHref) {
    return (
      <Link href={signedOutHref} className="topbar-switch-link">
        {signedOutLabel || "SIGN IN / SIGN UP"}
      </Link>
    );
  }

  return (
    <div className="auth-inline auth-signin-wrap">
      <div ref={buttonContainerRef} />
      {error && <small className="auth-error">{error}</small>}
    </div>
  );
}
