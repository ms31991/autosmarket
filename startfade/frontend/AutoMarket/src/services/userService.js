import { apiFetch } from "./api";
import { getClerkToken } from "./clerkToken";

import { API_BASE } from "../config/api";

export const getProfile = () => apiFetch("/Users/profile");

export const updateProfile = (payload) =>
  apiFetch("/Users/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const getMyVehicles = () => apiFetch("/Vehicles/my");

export const getFavourites = () => apiFetch("/Favourites");

export const uploadProfileImage = async (file) => {
  const token = await getClerkToken();
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${API_BASE}/Users/profile-image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || "Fotoja nuk u ngarkua.");
  }
  return data;
};

export const deleteProfileImage = () =>
  apiFetch("/Users/profile-image", { method: "DELETE" });
