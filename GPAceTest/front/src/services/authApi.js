import { AUTH_API_URL } from "../config/api";

function authHeaders(extraHeaders = {}) {
  const token = localStorage.getItem("auth_token");
  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export async function updateProfile(payload) {
  const response = await fetch(`${AUTH_API_URL}/profile`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function changePassword(currentPassword, newPassword) {
  const response = await fetch(`${AUTH_API_URL}/password`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ currentPassword, newPassword })
  });

  return parseResponse(response);
}

export async function uploadProfilePicture(file) {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch(`${AUTH_API_URL}/profile-picture`, {
    method: "POST",
    headers: authHeaders(),
    body: formData
  });

  return parseResponse(response);
}

export async function removeProfilePicture() {
  const response = await fetch(`${AUTH_API_URL}/profile-picture`, {
    method: "DELETE",
    headers: authHeaders()
  });

  return parseResponse(response);
}

export async function deleteAccount(password) {
  const response = await fetch(`${AUTH_API_URL}/account`, {
    method: "DELETE",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ password })
  });

  return parseResponse(response);
}
