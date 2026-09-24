import "./ChatWindow.css";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { getMessages, sendMessage } from "../services/chatService";

function parseChatDate(value) {
  if (!value) return null;
  const raw = String(value);
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(raw)) return new Date(raw);
  return new Date(raw.includes("T") ? `${raw}Z` : raw.replace(" ", "T") + "Z");
}

function sameId(left, right) {
  return left != null && right != null && String(left) === String(right);
}

export const ChatWindow = ({
  conversationId,
  otherUserName,
  connection,
  hideHeader = false,
}) => {
  const { dbUser } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesBoxRef = useRef(null);

  function isMine(message) {
    if (message.isMine === true || message.IsMine === true) return true;
    if (message.isMine === false || message.IsMine === false) return false;
    const senderId = message.senderId ?? message.SenderId;
    return (
      sameId(senderId, dbUser?.id) || sameId(senderId, dbUser?.clerkUserId)
    );
  }

  function normalize(message) {
    return {
      id: message.id ?? message.Id,
      conversationId: message.conversationId ?? message.ConversationId,
      senderId: message.senderId ?? message.SenderId,
      text: message.text ?? message.Text ?? "",
      sentAt: message.sentAt ?? message.SentAt,
      isMine: isMine(message),
    };
  }

  function sortMessages(list) {
    return [...list].sort((a, b) => {
      const left = parseChatDate(a.sentAt)?.getTime() || 0;
      const right = parseChatDate(b.sentAt)?.getTime() || 0;
      return left - right;
    });
  }

  async function fetchMessages() {
    if (!conversationId) return;

    try {
      setLoading(true);
      const data = await getMessages(conversationId);
      setMessages(sortMessages((Array.isArray(data) ? data : []).map(normalize)));
    } catch (err) {
      console.error("FETCH MESSAGES ERROR:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  useEffect(() => {
    if (!connection || !conversationId) return;

    function handleIncoming(message) {
      const incoming = normalize(message);
      if (Number(incoming.conversationId) !== Number(conversationId)) return;

      setMessages((prev) => {
        if (prev.some((item) => String(item.id) === String(incoming.id))) {
          return prev;
        }
        return sortMessages([...prev, incoming]);
      });
    }

    connection.on("ReceiveMessage", handleIncoming);
    connection.on("MessageSent", handleIncoming);

    return () => {
      connection.off("ReceiveMessage", handleIncoming);
      connection.off("MessageSent", handleIncoming);
    };
  }, [connection, conversationId, dbUser?.id, dbUser?.clerkUserId]);

  useEffect(() => {
    const box = messagesBoxRef.current;
    if (!box) return;
    box.scrollTop = box.scrollHeight;
  }, [messages]);

  async function handleSend(event) {
    event.preventDefault();
    if (!text.trim() || sending || !conversationId) return;

    try {
      setSending(true);
      const saved = await sendMessage(conversationId, text.trim());
      const incoming = normalize({ ...saved, isMine: true });
      setMessages((prev) => {
        if (prev.some((item) => String(item.id) === String(incoming.id))) {
          return prev;
        }
        return sortMessages([...prev, incoming]);
      });
      setText("");
    } catch (err) {
      console.error("SEND MESSAGE ERROR:", err);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateString) {
    const date = parseChatDate(dateString);
    if (!date || Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!conversationId) {
    return (
      <div className="chat-window">
        <div className="chat-window-empty">{t("chatPick")}</div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {!hideHeader && (
        <div className="chat-window-header">{otherUserName}</div>
      )}

      <div className="chat-window-messages" ref={messagesBoxRef}>
        {loading ? (
          <div className="chat-window-status">{t("loading")}</div>
        ) : messages.length === 0 ? (
          <div className="chat-window-status">{t("noMessages")}</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-window-row${msg.isMine ? " mine" : ""}`}
            >
              <div className="chat-window-bubble">{msg.text}</div>
              <div className="chat-window-time">{formatTime(msg.sentAt)}</div>
            </div>
          ))
        )}
      </div>

      <form className="chat-window-form" onSubmit={handleSend}>
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("writeMessage")}
          disabled={sending}
        />
        <button type="submit" disabled={!text.trim() || sending}>
          {t("send")}
        </button>
      </form>
    </div>
  );
};
