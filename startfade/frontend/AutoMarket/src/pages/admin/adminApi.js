import { API_BASE } from "../../config/api";
import { getClerkToken } from "../../services/clerkToken";

export async function getAdminToken() {
  return getClerkToken();
}

export async function adminFetch(path, options = {}) {
  return requestJson(`${API_BASE}/Admin${path}`, options);
}

export async function catalogFetch(path, options = {}) {
  return requestJson(`${API_BASE}${path}`, options);
}

async function requestJson(url, options = {}) {
  const token = await getClerkToken();
  if (!token) {
    throw new Error("You are not signed in.");
  }
  const hasBody = options.body !== undefined && options.body !== null;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body: hasBody && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }
  return data;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}
