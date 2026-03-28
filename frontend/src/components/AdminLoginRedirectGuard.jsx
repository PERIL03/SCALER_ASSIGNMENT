"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AdminLoginRedirectGuard({ forceAdminAuth, redirectTo }) {
  const router = useRouter();

  useEffect(() => {
    if (!forceAdminAuth) {
      return;
    }

    let cancelled = false;

    async function redirectIfAlreadyAuthenticated() {
      try {
        const data = await api.getCurrentUser();
        if (cancelled || !data?.user) return;

        if (data.user.isAdmin) {
          router.replace(redirectTo || "/dashboard");
          return;
        }

        router.replace("/book/intro-call?notice=admin-only");
      } catch {
        // User is not authenticated yet, keep login form visible.
      }
    }

    redirectIfAlreadyAuthenticated();

    return () => {
      cancelled = true;
    };
  }, [forceAdminAuth, redirectTo, router]);

  return null;
}
