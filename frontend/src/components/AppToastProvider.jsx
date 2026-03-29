"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeToToasts } from "@/lib/toast";

const DEFAULT_DURATION_MS = 4200;

function buildToast(detail) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message: String(detail?.message || ""),
    type: detail?.type || "info",
    durationMs: Number(detail?.durationMs) > 0 ? Number(detail.durationMs) : DEFAULT_DURATION_MS,
  };
}

export default function AppToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribeToToasts((detail) => {
      if (!detail?.message) return;
      setToasts((prev) => [...prev, buildToast(detail)]);
    });
  }, []);

  useEffect(() => {
    if (!toasts.length) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, toast.durationMs)
    );

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [toasts]);

  const renderedToasts = useMemo(() => toasts.slice(-4), [toasts]);

  return (
    <>
      {children}
      <div className="app-toast-stack" aria-live="polite" aria-atomic="false">
        {renderedToasts.map((toast) => (
          <article key={toast.id} className={`app-toast app-toast-${toast.type}`}>
            <p>{toast.message}</p>
            <button
              type="button"
              className="app-toast-close"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
              aria-label="Dismiss notification"
            >
              x
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
