import { useEffect } from "react";
import { apiFetch } from "./api";

// =====================================================
// GET OR CREATE CONVERSATION
// =====================================================

export const setChatPresence = async (open) => {
  return apiFetch("/Chat/presence", {
    method: "POST",
    keepalive: true,
    body: JSON.stringify({ open: Boolean(open) }),
  });
};

export function useChatPresence(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    let stopped = false;

    async function beat(open) {
      try {
        if (stopped && open) return;
        await setChatPresence(open);
      } catch {
        /* presence is optional */
      }
    }

    const sync = () =>
      beat(typeof document === "undefined" || document.visibilityState === "visible");
    sync();
    const timer = window.setInterval(sync, 8000);
    document.addEventListener("visibilitychange", sync);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      beat(false);
    };
  }, [enabled]);
}

export const getOrCreateConversation = async (
  otherUserId,
  vehicleId = null
) => {
  let url = `/Chat/conversation/${otherUserId}`;

  if (vehicleId) {
    url += `?vehicleId=${vehicleId}`;
  }

  return await apiFetch(url);
};


// =====================================================
// GET ALL CONVERSATIONS
// =====================================================

export const getConversations = async () => {
  return await apiFetch("/Chat/conversations");
};


// =====================================================
// GET MESSAGES
// =====================================================

export const getMessages = async (conversationId) => {
  return await apiFetch(
    `/Chat/${conversationId}/messages`
  );
};


// =====================================================
// SEND MESSAGE
// =====================================================

export const sendMessage = async (
  conversationId,
  text
) => {
  return await apiFetch("/Chat/send", {
    method: "POST",

    body: JSON.stringify({
      conversationId,
      text,
    }),
  });
};


// =====================================================
// MARK AS READ
// =====================================================

export const markAsRead = async (
  conversationId
) => {
  return await apiFetch(
    `/Chat/${conversationId}/read`,
    {
      method: "POST",
    }
  );
};

export const deleteConversation = async (
  conversationId
) => {
  return await apiFetch(
    `/Chat/${conversationId}`,
    {
      method: "DELETE",
    }
  );
};