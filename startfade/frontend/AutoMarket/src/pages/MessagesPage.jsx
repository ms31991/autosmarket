import "./MessagesPage.css";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

import {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  deleteConversation,
  getOrCreateConversation,
} from "../services/chatService";
import { getFriends, onFriendshipChanged } from "../services/friendService";
import { mediaUrl } from "../utils/mediaUrl";

import { createChatConnection } from "../services/signalRService";
import { ChatWindow } from "./ChatWindow";

import { getClerkToken } from "../services/clerkToken";

import {
  FiSearch,
  FiEdit,
  FiMoreVertical,
  FiSend,
  FiTrash2,
  FiBookmark,
  FiMessageCircle,
  FiCheckCircle,
  FiPaperclip,
  FiSmile,
  FiArrowLeft,
  FiUser,
} from "react-icons/fi";

export const MessagesPage = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatConnection, setChatConnection] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [pinnedIds, setPinnedIds] = useState([]);
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const menuRef = useRef(null);

  const currentUserId = user?.id || null;

  const pinStorageKey = (userId) =>
    `automarket-pinned-conversations:${userId || "guest"}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(
        pinStorageKey(currentUserId)
      );
      setPinnedIds(
        stored
          ? JSON.parse(stored).map(Number)
          : []
      );
    } catch {
      setPinnedIds([]);
    }
  }, [currentUserId]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpenId(null);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () =>
      document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const persistPinned = (ids) => {
    setPinnedIds(ids);
    localStorage.setItem(
      pinStorageKey(currentUserId),
      JSON.stringify(ids)
    );
  };

  const togglePin = (conversationId) => {
    const id = Number(conversationId);
    const isPinned = pinnedIds.includes(id);
    persistPinned(
      isPinned
        ? pinnedIds.filter((item) => item !== id)
        : [id, ...pinnedIds]
    );
    setMenuOpenId(null);
  };

  const handleDeleteConversation = async (conversationId) => {
    setMenuOpenId(null);

    if (!window.confirm("Delete this conversation?")) {
      return;
    }

    try {
      await deleteConversation(conversationId);

      persistPinned(
        pinnedIds.filter((id) => id !== Number(conversationId))
      );

      setConversations((prev) =>
        prev.filter((item) => item.id !== conversationId)
      );

      if (
        Number(selectedConversation?.id) === Number(conversationId)
      ) {
        setSelectedConversation(null);
        setMessages([]);
        navigate("/messages");
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  async function openFriendPicker() {
    const next = !showFriendPicker;
    setShowFriendPicker(next);
    if (!next) return;
    setFriendsLoading(true);
    try {
      const data = await getFriends();
      setFriends(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading friends:", error);
      setFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  }

  useEffect(() => {
    if (!showFriendPicker) return undefined;
    return onFriendshipChanged(async () => {
      try {
        const data = await getFriends();
        setFriends(Array.isArray(data) ? data : []);
      } catch {
        setFriends([]);
      }
    });
  }, [showFriendPicker]);

  async function startChatWithFriend(friend) {
    try {
      const created = await getOrCreateConversation(friend.id);
      const conversationId = created?.id ?? created?.Id;
      if (!conversationId) return;

      const list = await getConversations();
      const items = Array.isArray(list) ? list : [];
      setConversations(items);
      setShowFriendPicker(false);
      navigate(`/messages/${conversationId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  const renderConversationMenu = (conversation, placement) => {
    const menuKey = `${conversation.id}:${placement}`;
    const isOpen = menuOpenId === menuKey;

    return (
      <div
        className={`conversation-menu ${placement}`}
        ref={isOpen ? menuRef : null}
      >
        <button
          type="button"
          className="conversation-menu-trigger"
          title="More"
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpenId(isOpen ? null : menuKey);
          }}
        >
          <FiMoreVertical size={placement === "header" ? 21 : 18} />
        </button>

        {isOpen && (
          <div className="conversation-menu-dropdown">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                togglePin(conversation.id);
              }}
            >
              <FiBookmark size={16} />
              {pinnedIds.includes(Number(conversation.id)) ? "Unpin" : "Pin"}
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpenId(null);
                if (conversation.otherUserId) {
                  navigate(`/userprofile/${conversation.otherUserId}`);
                }
              }}
            >
              <FiUser size={16} />
              View profile
            </button>

            <button
              type="button"
              className="danger"
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteConversation(conversation.id);
              }}
            >
              <FiTrash2 size={16} />
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  // =====================================================
  // GET USER FULL NAME
  // =====================================================

  const getUserFullName = (conversation) => {
    if (!conversation) {
      return "User";
    }

    const looksLikeId = (value) =>
      typeof value === "string" &&
      (value.startsWith("user_") ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value
        ));

    const fromParts = [
      conversation.otherUserFirstName,
      conversation.otherUserLastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (fromParts && !looksLikeId(fromParts)) {
      return fromParts;
    }

    if (
      conversation.otherUserFullName &&
      !looksLikeId(conversation.otherUserFullName)
    ) {
      return conversation.otherUserFullName;
    }

    if (
      conversation.otherUserName &&
      !looksLikeId(conversation.otherUserName)
    ) {
      return conversation.otherUserName;
    }

    return "User";
  };

  // =====================================================
  // GET USER AVATAR
  // =====================================================

  const getUserAvatar = (conversation) => {
    return (
      conversation?.otherUserAvatarUrl ||
      conversation?.otherUserImageUrl ||
      null
    );
  };

  // =====================================================
  // LOAD CONVERSATIONS
  // =====================================================

  const loadConversations = async () => {
    try {
      setLoading(true);

      const token = await getClerkToken();

      if (!token) {
        console.error("Clerk token nuk u gjet.");
        return;
      }

      const data = await getConversations(token);

      setConversations(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Error loading conversations:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // =====================================================
  // SIGNALR
  // =====================================================

  useEffect(() => {
    let connection;

    const startConnection = async () => {
      try {
        const token = await getClerkToken();

        if (!token) {
          return;
        }

        connection = createChatConnection(
          async () => {
            const freshToken =
              await getClerkToken();

            return freshToken || "";
          }
        );

        connection.on(
          "ReceiveMessage",
          async (message) => {
            console.log(
              "Received message:",
              message
            );

            if (
              selectedConversation &&
              Number(message.conversationId) ===
                Number(selectedConversation.id)
            ) {
              setMessages((prev) => {
                const exists = prev.some(
                  (item) =>
                    item.id === message.id
                );

                if (exists) {
                  return prev;
                }

                return [...prev, message];
              });

              try {
                const freshToken =
                  await getClerkToken();

                if (freshToken) {
                  await markAsRead(
                    selectedConversation.id,
                    freshToken
                  );
                }
              } catch (error) {
                console.error(
                  "Mark as read error:",
                  error
                );
              }
            }

            await loadConversations();
          }
        );

        await connection.start();
        setChatConnection(connection);

        console.log(
          "Chat SignalR connected"
        );
      } catch (error) {
        console.error(
          "SignalR connection error:",
          error
        );
      }
    };

    if (user) {
      startConnection();
    }

    return () => {
      if (connection) {
        connection.off(
          "ReceiveMessage"
        );

        connection.stop();
      }
    };
  }, [
    user,
    selectedConversation?.id,
  ]);

  // =====================================================
  // OPEN CONVERSATION
  // =====================================================

  const openConversation = async (conversation) => {
    try {
      setSelectedConversation(conversation);

      const token = await getClerkToken();
      if (!token) {
        return;
      }

      const data = await getMessages(conversation.id, token);
      setMessages(Array.isArray(data) ? data : []);

      await markAsRead(conversation.id, token);

      setConversations((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(conversation.id)
            ? { ...item, unreadCount: 0 }
            : item
        )
      );
    } catch (error) {
      console.error("Error opening conversation:", error);
    }
  };

  useEffect(() => {
    if (!conversationId) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    if (Number(selectedConversation?.id) === Number(conversationId)) {
      return;
    }

    const match = conversations.find(
      (item) => Number(item.id) === Number(conversationId)
    );

    if (match) {
      openConversation(match);
      return;
    }

    if (!loading) {
      openConversation({ id: conversationId });
    }
  }, [conversationId, conversations, loading]);

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const handleSend = async (e) => {
    e.preventDefault();

    if (
      !text.trim() ||
      !selectedConversation ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);

      const token =
        await getClerkToken();

      if (!token) {
        return;
      }

      const newMessage =
        await sendMessage(
          selectedConversation.id,
          text.trim(),
          token
        );

      setMessages((prev) => {
        const exists = prev.some(
          (item) =>
            item.id === newMessage.id
        );

        if (exists) {
          return prev;
        }

        return [...prev, newMessage];
      });

      setText("");

      await loadConversations();
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
  // FORMAT TIME
  // =====================================================

  const formatTime = (date) => {
    if (!date) {
      return "";
    }

    return new Date(date).toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // =====================================================
  // FORMAT CONVERSATION TIME
  // =====================================================

  const formatConversationTime = (
    date
  ) => {
    if (!date) {
      return "";
    }

    const now = new Date();
    const then = new Date(date);

    const diff =
      now.getTime() -
      then.getTime();

    const minutes = Math.floor(
      diff / 60000
    );

    const hours = Math.floor(
      minutes / 60
    );

    const days = Math.floor(
      hours / 24
    );

    if (minutes < 1) {
      return "now";
    }

    if (minutes < 60) {
      return `${minutes}m`;
    }

    if (hours < 24) {
      return `${hours}h`;
    }

    if (days < 7) {
      return `${days}d`;
    }

    return then.toLocaleDateString(
      [],
      {
        day: "2-digit",
        month: "short",
      }
    );
  };

  // =====================================================
  // GET INITIALS
  // =====================================================

  const getInitials = (name) => {
    if (!name) {
      return "U";
    }

    const parts = name
      .trim()
      .split(/\s+/);

    const first =
      parts[0]?.charAt(0) || "";

    const last =
      parts.length > 1
        ? parts[
            parts.length - 1
          ]?.charAt(0)
        : "";

    return (
      first + last
    ).toUpperCase();
  };

  // =====================================================
  // FILTER CONVERSATIONS
  // =====================================================

  const filteredConversations = conversations
    .filter((conversation) => {
      const fullName = getUserFullName(conversation);

      return (
        fullName
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        conversation.vehicleTitle
          ?.toLowerCase()
          .includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      const aPinned = pinnedIds.includes(Number(a.id)) ? 1 : 0;
      const bPinned = pinnedIds.includes(Number(b.id)) ? 1 : 0;
      return bPinned - aPinned;
    });

  // =====================================================
  // LAST MESSAGE
  // =====================================================

  const getLastMessage = (
    conversation
  ) => {
    if (
      conversation.lastMessage
    ) {
      return conversation.lastMessage;
    }

    if (
      conversation.vehicleTitle
    ) {
      return conversation.vehicleTitle;
    }

    return "No messages yet";
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="messages-page">
      <div className="messages-container">

        {/* =================================================
            LEFT SIDEBAR
        ================================================= */}

        <aside className="messages-sidebar">

          {/* SIDEBAR HEADER */}

          <div className="messages-sidebar-header">
            <div>
              <h1>
                Messages
              </h1>

              <p>
                Your conversations
              </p>
            </div>

            <button
              className={`messages-header-icon${showFriendPicker ? " active" : ""}`}
              type="button"
              title="New message"
              onClick={openFriendPicker}
            >
              <FiEdit size={19} />
            </button>
          </div>

          {showFriendPicker && (
            <div className="friend-picker">
              <div className="friend-picker-title">Friends</div>
              {friendsLoading ? (
                <p className="friend-picker-empty">Loading...</p>
              ) : friends.length === 0 ? (
                <p className="friend-picker-empty">
                  You have no friends yet. Add someone from their profile.
                </p>
              ) : (
                friends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    className="friend-picker-item"
                    onClick={() => startChatWithFriend(friend)}
                  >
                    {friend.profileImage ? (
                      <img src={mediaUrl(friend.profileImage)} alt="" />
                    ) : (
                      <span className="friend-picker-avatar">
                        {(friend.name || "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <strong>{friend.name || "User"}</strong>
                  </button>
                ))
              )}
            </div>
          )}

          {/* SEARCH */}

          <div className="messages-search">
            <FiSearch size={19} />

            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />
          </div>

          {/* SECTION TITLE */}

          <div className="messages-section-title">
            <span>
              Messages
            </span>
          </div>

          {/* CONVERSATION LIST */}

          <div className="conversation-list">

            {loading ? (

              <div className="messages-loading">
                <div className="loading-spinner" />

                <span>
                  Loading conversations...
                </span>
              </div>

            ) : filteredConversations.length ===
              0 ? (

              <div className="messages-empty-sidebar">

                <FiMessageCircle
                  size={38}
                />

                <p>
                  No conversations yet
                </p>

                <span>
                  Start a conversation
                  with a seller.
                </span>
              </div>

            ) : (

              filteredConversations.map(
                (conversation) => {

                  const isSelected =
                    Number(selectedConversation?.id) ===
                    Number(conversation.id);

                  const fullName =
                    getUserFullName(
                      conversation
                    );

                  const avatar =
                    getUserAvatar(
                      conversation
                    );

                  return (
                    <div
                      key={
                        conversation.id
                      }
                      className={`conversation-item ${
                        isSelected
                          ? "selected"
                          : ""
                      } ${
                        pinnedIds.includes(
                          Number(conversation.id)
                        )
                          ? "pinned"
                          : ""
                      }`}
                      onClick={() =>
                        navigate(
                          `/messages/${conversation.id}`
                        )
                      }
                    >

                      {/* AVATAR */}

                      <div className="conversation-avatar">

                        {avatar ? (

                          <img
                            src={avatar}
                            alt={
                              fullName
                            }
                          />

                        ) : (

                          <span>
                            {getInitials(
                              fullName
                            )}
                          </span>

                        )}

                        <span className="online-dot" />

                      </div>

                      {/* CONTENT */}

                      <div className="conversation-content">

                        <div className="conversation-top">

                          <h3>
                            {fullName}
                          </h3>

                          <span className="conversation-time">
                            {formatConversationTime(
                              conversation.lastMessageAt
                            )}
                          </span>

                        </div>

                        {conversation.vehicleTitle && (
                          <div className="conversation-vehicle">
                            {
                              conversation.vehicleTitle
                            }
                          </div>
                        )}

                        <div className="conversation-bottom">

                          <p>
                            {getLastMessage(
                              conversation
                            )}
                          </p>

                          {conversation.unreadCount >
                            0 && (
                            <span className="unread-badge">
                              {
                                conversation.unreadCount
                              }
                            </span>
                          )}

                        </div>

                      </div>

                      {renderConversationMenu(
                        conversation,
                        "list"
                      )}

                    </div>
                  );
                }
              )

            )}

          </div>
        </aside>

        {/* =================================================
            CHAT AREA
        ================================================= */}

        <main className="messages-chat">

          {!selectedConversation ? (

            <div className="chat-placeholder">

              <div className="chat-placeholder-icon">
                <FiMessageCircle
                  size={34}
                />
              </div>

              <h2>
                Your messages
              </h2>

              <p>
                Select a conversation
                to start chatting.
              </p>

            </div>

          ) : (

            <>

              {/* CHAT HEADER */}

              <header className="chat-header">

                <div className="chat-user-info">

                  <button
                    type="button"
                    className="mobile-back-button"
                    onClick={() =>
                      navigate("/messages")
                    }
                  >
                    <FiArrowLeft
                      size={20}
                    />
                  </button>

                  <div className="chat-avatar">

                    {getUserAvatar(
                      selectedConversation
                    ) ? (

                      <img
                        src={getUserAvatar(
                          selectedConversation
                        )}
                        alt={getUserFullName(
                          selectedConversation
                        )}
                      />

                    ) : (

                      <span>
                        {getInitials(
                          getUserFullName(
                            selectedConversation
                          )
                        )}
                      </span>

                    )}

                    <span className="online-dot" />

                  </div>

                  <div className="chat-user-details">

                    <h2>
                      {getUserFullName(
                        selectedConversation
                      )}
                    </h2>

                    {selectedConversation.vehicleTitle ? (

                      <p>
                        {
                          selectedConversation.vehicleTitle
                        }
                      </p>

                    ) : (

                      <p className="online-text">
                        Active conversation
                      </p>

                    )}

                  </div>

                </div>

                <div className="chat-header-actions">
                  {renderConversationMenu(
                    selectedConversation,
                    "header"
                  )}
                </div>

              </header>

              <ChatWindow
                conversationId={selectedConversation.id}
                otherUserName={getUserFullName(selectedConversation)}
                connection={chatConnection}
                hideHeader
              />

            </>

          )}

        </main>

      </div>
    </div>
  );
};
