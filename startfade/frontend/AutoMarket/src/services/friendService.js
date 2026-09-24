import { apiFetch } from "./api";

export const FRIENDSHIP_CHANGED = "automarket-friendship-changed";

export function emitFriendshipChanged(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FRIENDSHIP_CHANGED, { detail }));
}

export function onFriendshipChanged(handler) {
  if (typeof window === "undefined") return () => {};
  const listener = (event) => handler(event.detail || {});
  window.addEventListener(FRIENDSHIP_CHANGED, listener);
  return () => window.removeEventListener(FRIENDSHIP_CHANGED, listener);
}

function normalizeFriends(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.friends)) return data.friends;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export const getFriends = async () => {
  try {
    const data = await apiFetch("/Friends/mine");
    return normalizeFriends(data);
  } catch (error) {
    console.error("Friends/mine failed:", error);
  }

  const data = await apiFetch("/Friends/list");
  return normalizeFriends(data);
};

export const getPublicProfile = (userId) =>
  apiFetch(`/Users/public/${userId}`);

export const getVehiclesByOwner = (ownerId) =>
  apiFetch(`/Vehicles/owner/${ownerId}`);

export const getFriendStatus = (userId) =>
  apiFetch(`/Friends/status/${userId}`);

export const sendFriendRequest = async (userId) => {
  const result = await apiFetch(`/Friends/request/${userId}`, { method: "POST" });
  emitFriendshipChanged({
    otherUserId: userId,
    status: result?.status || "pending_sent",
    friendshipId: result?.friendshipId || null,
  });
  return result;
};

export const acceptFriendRequest = async (friendshipId) => {
  const result = await apiFetch(`/Friends/${friendshipId}/accept`, {
    method: "POST",
  });
  emitFriendshipChanged({
    friendshipId,
    status: "friends",
    source: "accept",
  });
  return result;
};

export const rejectFriendRequest = async (friendshipId) => {
  const result = await apiFetch(`/Friends/${friendshipId}/reject`, {
    method: "POST",
  });
  emitFriendshipChanged({
    friendshipId,
    status: "none",
    source: "reject",
  });
  return result;
};

export const removeFriend = async (userId) => {
  const result = await apiFetch(`/Friends/${userId}`, { method: "DELETE" });
  emitFriendshipChanged({
    otherUserId: userId,
    status: "none",
    source: "remove",
  });
  return result;
};

export function parseFriendNotification(type) {
  const value = String(type || "");
  const [kind, friendshipId, fromUserId] = value.split(":");
  return {
    kind,
    friendshipId: friendshipId ? Number(friendshipId) : null,
    fromUserId: fromUserId || null,
    isFriendRequest: kind === "FriendRequest",
    isSettled: kind === "FriendRequestSettled",
  };
}

export function sameUserId(left, right) {
  if (left == null || right == null || left === "" || right === "") return false;
  return String(left).toLowerCase() === String(right).toLowerCase();
}
