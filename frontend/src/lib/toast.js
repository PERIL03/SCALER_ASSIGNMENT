const TOAST_EVENT_NAME = "cal-toast";

export function showToast(message, type = "info", durationMs = 4200) {
  if (!message || typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT_NAME, {
      detail: {
        message: String(message),
        type,
        durationMs,
      },
    })
  );
}

export function subscribeToToasts(handler) {
  if (typeof window === "undefined" || typeof handler !== "function") {
    return () => {};
  }

  const listener = (event) => {
    handler(event?.detail || {});
  };

  window.addEventListener(TOAST_EVENT_NAME, listener);
  return () => window.removeEventListener(TOAST_EVENT_NAME, listener);
}
