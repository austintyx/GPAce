export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("auth_user") || "{}");
  } catch (err) {
    return {};
  }
}

export function isGuestSession() {
  const token = localStorage.getItem("auth_token") || "";
  return localStorage.getItem("auth_guest") === "true" || token.startsWith("guest-token-");
}

export function getDisplayName() {
  const user = getStoredUser();
  return user.name || (isGuestSession() ? "Guest" : "Student");
}

export function getInitials(name = getDisplayName()) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "GP";
}

export function clearSession() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  localStorage.removeItem("auth_guest");
  localStorage.removeItem("guest_modules");
}
