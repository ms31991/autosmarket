import { getClerkToken } from "./clerkToken";

import { API_BASE } from "../config/api";

export async function apiFetch(endpoint, options = {}) {
  // Merr token-in aktual nga Clerk
  const { token: providedToken, ...fetchOptions } = options;
  const token = providedToken || await getClerkToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Dërgo Clerk JWT te backend-i
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // Nëse request-i dështoi
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.message ||
        `Request failed: ${response.status}`
    );
  }

  // 204 = No Content
  if (response.status === 204) {
    return null;
  }

  // Nëse nuk ka content
  const contentType = response.headers.get("content-type");

  if (!contentType || !contentType.includes("application/json")) {
    return null;
  }

  return await response.json();
}