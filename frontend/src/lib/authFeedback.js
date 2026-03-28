export function getAuthErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;

  const rawMessage = String(error.message || "").toLowerCase();
  const status = Number(error.status || 0);

  if (status === 401) {
    if (rawMessage.includes("invalid email or password")) {
      return "Email or password is incorrect. Double-check and try again.";
    }
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    if (rawMessage.includes("verify")) {
      return "Please verify your email address before continuing.";
    }
    return "You do not have permission to perform this action yet.";
  }

  if (status === 409 || rawMessage.includes("already")) {
    return "An account with this email already exists. Please sign in instead.";
  }

  if (status === 429) {
    return "Too many attempts. Please wait a moment before trying again.";
  }

  if (rawMessage.includes("token") && rawMessage.includes("expired")) {
    return "This link has expired. Request a fresh link and try again.";
  }

  if (rawMessage.includes("token") && rawMessage.includes("invalid")) {
    return "This link is invalid. Request a new one and try again.";
  }

  if (rawMessage.includes("network") || rawMessage.includes("failed to fetch")) {
    return "We could not reach the server. Check your connection and try again.";
  }

  return error.message || fallback;
}
