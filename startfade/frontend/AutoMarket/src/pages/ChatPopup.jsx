import "./ChatPopup.css";
import { useEffect, useRef, useState } from "react";
import {
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markAsRead,
} from "../services/chatService";

export const ChatPopup = ({
  sellerId,
  vehicleId,
  onClose,
}) => {
  const [conversationId, setConversationId] =
    useState(null);

  const [messages, setMessages] = useState([]);

  const [text, setText] = useState("");

  const [loading, setLoading] = useState(true);

  const [sending, setSending] = useState(false);

  const messagesBoxRef = useRef(null);

  const scrollToBottom = () => {
    const box = messagesBoxRef.current;
    if (!box) return;
    box.scrollTop = box.scrollHeight;
  };


  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  // =====================================================
  // OPEN CONVERSATION
  // =====================================================

  useEffect(() => {
    const openConversation = async () => {
      try {
        setLoading(true);

        const conversation =
          await getOrCreateConversation(
            sellerId,
            vehicleId
          );

        setConversationId(
          conversation.id
        );

        const conversationMessages =
          await getMessages(
            conversation.id
          );

        setMessages(
          conversationMessages
        );

        await markAsRead(
          conversation.id
        );
      } catch (error) {
        console.error(
          "Chat error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      openConversation();
    }
  }, [sellerId, vehicleId]);


  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const handleSend = async (e) => {
    e.preventDefault();

    if (
      !text.trim() ||
      !conversationId ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);

      const newMessage =
        await sendMessage(
          conversationId,
          text.trim()
        );

      setMessages((prev) => [
        ...prev,
        newMessage,
      ]);

      setText("");
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );
    } finally {
      setSending(false);
    }
  };


  // =====================================================
  // ENTER TO SEND
  // SHIFT + ENTER = NEW LINE
  // =====================================================

  const handleKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      handleSend(e);
    }
  };


  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="fixed bottom-5 right-5 w-[390px] h-[550px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="h-[68px] px-5 border-b bg-white flex items-center justify-between flex-shrink-0">

        <div className="flex items-center gap-3">

          {/* Avatar */}

          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
            S
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">
              Chat with seller
            </h3>

            <p className="text-xs text-green-500">
              Online
            </p>
          </div>

        </div>


        {/* Close */}

        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition"
        >
          ✕
        </button>

      </div>


      {/* =================================================
          MESSAGES
      ================================================= */}

      <div
        className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4"
        ref={messagesBoxRef}
      >

        {loading ? (

          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-gray-500">
              Loading messages...
            </p>
          </div>

        ) : messages.length === 0 ? (

          <div className="h-full flex flex-col items-center justify-center text-center px-6">

            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-2xl mb-3">
              💬
            </div>

            <h4 className="font-semibold text-gray-800">
              Start a conversation
            </h4>

            <p className="text-sm text-gray-500 mt-1">
              Send a message to the seller about this vehicle.
            </p>

          </div>

        ) : (

          <div className="space-y-2">

            {messages.map((message) => {

              const isMine =
                message.senderId !== sellerId;

              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isMine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >

                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-md"
                    }`}
                  >

                    <p className="whitespace-pre-wrap break-words">
                      {message.text}
                    </p>

                    <div
                      className={`text-[10px] mt-1 ${
                        isMine
                          ? "text-blue-100"
                          : "text-gray-400"
                      }`}
                    >
                      {message.sentAt
                        ? new Date(
                            message.sentAt
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : ""}
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>


      {/* =================================================
          MESSAGE INPUT
      ================================================= */}

      <form
        onSubmit={handleSend}
        className="p-3 bg-white border-t border-gray-200 flex-shrink-0"
      >

        <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-2 py-2 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition">

          {/* Textarea */}

          <textarea
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none border-none px-2 py-2 text-sm text-gray-800 placeholder-gray-400 max-h-24"
          />


          {/* Send button */}

          <button
            type="submit"
            disabled={
              !text.trim() ||
              !conversationId ||
              sending
            }
            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >

            {sending ? (

              <svg
                className="w-5 h-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-30"
                />

                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>

            ) : (

              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M22 2L11 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M22 2L15 22L11 13L2 9L22 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

            )}

          </button>

        </div>

        <p className="text-[10px] text-gray-400 mt-1.5 ml-2">
          Press Enter to send · Shift + Enter for new line
        </p>

      </form>

    </div>
  );
};