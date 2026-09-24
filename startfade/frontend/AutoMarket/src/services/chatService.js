import { apiFetch } from "./api";

// =====================================================
// GET OR CREATE CONVERSATION
// =====================================================

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