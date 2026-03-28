const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const DEFAULT_API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://scaler-assignment-1-iil4.onrender.com"
    : "http://localhost:4000";

const API_BASE_URL = (RAW_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
    cache: "no-store",
    credentials: "include",
  });

  if (response.status === 204) {
    return null;
  }

  let data = null;
  const responseContentType = response.headers.get("content-type") || "";
  if (responseContentType.includes("application/json")) {
    data = await response.json().catch(() => null);
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message || "Request failed",
      response.status,
      data?.code
    );
  }

  return data;
}

export const api = {
  emailSignUp: (payload) =>
    request("/api/auth/email-signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  emailSignIn: (payload) =>
    request("/api/auth/email-signin", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  googleSignIn: (idToken) =>
    request("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }),
  sendVerification: () =>
    request("/api/auth/send-verification", {
      method: "POST",
    }),
  verifyEmailToken: (token) =>
    request("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  forgotPassword: (email) =>
    request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token, password) =>
    request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  getCurrentUser: () => request("/api/auth/me"),
  logout: () =>
    request("/api/auth/logout", {
      method: "POST",
    }),
  getEventTypes: () => request("/api/event-types"),
  createEventType: (payload) =>
    request("/api/event-types", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateEventType: (id, payload) =>
    request(`/api/event-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteEventType: (id) =>
    request(`/api/event-types/${id}`, {
      method: "DELETE",
    }),
  getAvailability: () => request("/api/availability"),
  updateAvailability: (payload) =>
    request("/api/availability", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getBookings: (scope) => request(`/api/bookings?scope=${scope}`),
  cancelBooking: (id) =>
    request(`/api/bookings/${id}/cancel`, {
      method: "POST",
    }),
  completeOnboarding: (payload) =>
    request("/api/onboarding/complete", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getPublicEvent: (slug) => request(`/api/public/${slug}`),
  getPublicSlots: (slug, date) => request(`/api/public/${slug}/slots?date=${date}`),
  createPublicBooking: (slug, payload) =>
    request(`/api/public/${slug}/book`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getBookingConfirmation: (id) => request(`/api/public/bookings/${id}`),
};
