"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GoogleAuthControls from "@/components/GoogleAuthControls";
import { api } from "@/lib/api";

const ASSIGNMENT_MODE = process.env.NEXT_PUBLIC_ASSIGNMENT_MODE !== "false";

const navItems = [
  {
    href: "/dashboard",
    label: "Event Types",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    ),
  },
  {
    href: "/availability",
    label: "Availability",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    ),
  },
  {
    href: "/bookings",
    label: "Bookings",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7 3v3M17 3v3" />
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M4 10h16" />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(ASSIGNMENT_MODE);

  useEffect(() => {
    if (ASSIGNMENT_MODE) {
      return;
    }

    let cancelled = false;

    async function validateSession() {
      try {
        const data = await api.getCurrentUser();
        if (cancelled) return;

        if (!data.user?.emailVerified) {
          router.replace(`/verify-email?next=${encodeURIComponent(pathname)}`);
          return;
        }

        if (!data.user?.onboardingCompleted) {
          router.replace(`/onboarding?next=${encodeURIComponent(pathname)}`);
          return;
        }

        setReady(true);
      } catch {
        if (!cancelled) {
          router.replace(`/signup?next=${encodeURIComponent(pathname)}`);
        }
      }
    }

    validateSession();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="app-shell app-guard-shell">
        <p className="page-subtitle">Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <Link href="/" className="brand-link" aria-label="cal.com Home">
            <Image
              src="/calcom-logo.svg"
              alt="Cal.com style logo"
              className="brand-logo"
              width={30}
              height={30}
              priority
            />
            <span>cal.com</span>
          </Link>
          <span className="topbar-tag">Personal Workspace</span>
        </div>
        <div className="topbar-right">
          <Link className="topbar-new-btn" href="/dashboard">
            + New event
          </Link>
          {!ASSIGNMENT_MODE ? <GoogleAuthControls compact /> : null}
        </div>
      </header>

      <div className="content-shell">
        <aside className="sidebar">
          <p className="sidebar-label">Scheduling</p>
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "nav-item nav-item-active" : "nav-item"}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </aside>

        <main key={pathname} className="main-panel page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
