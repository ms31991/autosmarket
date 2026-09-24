
import "./NotificationBell.css";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import { getClerkToken } from "../services/clerkToken";
import {
  createNotificationConnection,
} from "../services/signalRService";
import {
  acceptFriendRequest,
  emitFriendshipChanged,
  onFriendshipChanged,
  parseFriendNotification,
  rejectFriendRequest,
} from "../services/friendService";

const MOBILE_QUERY = "(max-width: 768px)";

export const NotificationBell = ({
  open: controlledOpen,
  setOpen: setControlledOpen,
  notificationWrapperRef,
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ring, setRing] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = typeof setControlledOpen === "function";
  const open = isControlled ? Boolean(controlledOpen) : internalOpen;
  const setOpen = (next) => {
    const value = typeof next === "function" ? next(open) : next;
    if (isControlled) {
      setControlledOpen(value);
    } else {
      setInternalOpen(value);
    }
  };

  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(MOBILE_QUERY).matches
  );

  // =====================================================
  // LOAD NOTIFICATIONS
  // =====================================================

  const loadNotifications = async () => {
    try {
      const token = await getClerkToken();
      if (!token) return;

      const data = await apiFetch("/Notifications");
      const list = Array.isArray(data) ? data : [];

      setNotifications(list);
      setUnreadCount(list.filter((notification) => !notification.isRead).length);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      setNotifications([]);
    }
  };

  // =====================================================
  // SIGNALR
  // =====================================================

  useEffect(() => {
    let isMounted = true;
    let connection;

    const boot = async () => {
      const token = await getClerkToken();
      if (!token || !isMounted) return;

      await loadNotifications();

      connection = createNotificationConnection();
      connection.on("ReceiveNotification", (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        setRing(true);
        setTimeout(() => {
          if (isMounted) setRing(false);
        }, 600);
      });
      connection.on("NotificationUpdated", (notification) => {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, ...notification } : item
          )
        );
      });
      connection.on("NotificationRemoved", (payload) => {
        setNotifications((prev) =>
          prev.filter((item) => item.id !== payload?.id)
        );
      });
      connection.on("FriendshipUpdated", (payload) => {
        emitFriendshipChanged(payload);
      });

      try {
        await connection.start();
      } catch (error) {
        if (isMounted) {
          console.error("NotificationHub connection error:", error);
        }
      }
    };

    boot();

    return () => {
      isMounted = false;
      connection?.off("ReceiveNotification");
      connection?.off("NotificationUpdated");
      connection?.off("NotificationRemoved");
      connection?.off("FriendshipUpdated");
      connection?.stop();
    };
  }, []);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  // =====================================================
  // MOBILE DETECTION
  // =====================================================

  useEffect(() => {
    const mq =
      window.matchMedia(MOBILE_QUERY);

    const sync = () =>
      setIsMobile(mq.matches);

    sync();

    mq.addEventListener(
      "change",
      sync
    );

    return () =>
      mq.removeEventListener(
        "change",
        sync
      );
  }, []);

  // =====================================================
  // CLOSE ON ESC / OUTSIDE
  // =====================================================

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const onPointerDown = (event) => {
      /*
       * The ref is passed from Navbar and contains
       * both the bell and "Updates".
       */
      if (
        notificationWrapperRef?.current &&
        !notificationWrapperRef.current.contains(
          event.target
        )
      ) {
        setOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    if (!isMobile) {
      window.addEventListener(
        "pointerdown",
        onPointerDown
      );
    }

    if (isMobile) {
      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";
      document.body.classList.add("notifications-open");

      return () => {
        window.removeEventListener(
          "keydown",
          onKeyDown
        );

        document.body.style.overflow =
          previousOverflow;
        document.body.classList.remove("notifications-open");
      };
    }

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown
      );

      window.removeEventListener(
        "pointerdown",
        onPointerDown
      );
    };
  }, [
    open,
    isMobile,
    setOpen,
    notificationWrapperRef,
  ]);

  // =====================================================
  // MARK ONE AS READ
  // =====================================================

  const handleNotificationClick =
    async (notification) => {
      const type = String(notification.type || "");
      const parsed = parseFriendNotification(type);
      const conversationId =
        notification.conversationId ||
        (type.startsWith("message:") ? type.split(":")[1] : null);

      if (!notification.isRead) {
        try {
          await apiFetch(
            `/Notifications/${notification.id}/read`,
            {
              method: "PUT",
            }
          );

          setNotifications((prev) =>
            prev.map((item) =>
              item.id === notification.id
                ? {
                    ...item,
                    isRead: true,
                  }
                : item
            )
          );

          setUnreadCount((prev) =>
            Math.max(0, prev - 1)
          );
        } catch (error) {
          console.error(
            "Mark notification error:",
            error
          );
        }
      }

      if (parsed.isFriendRequest && parsed.fromUserId) {
        setOpen(false);
        navigate(`/userprofile/${parsed.fromUserId}`);
        return;
      }

      if (conversationId) {
        setOpen(false);
        navigate(`/messages/${conversationId}`);
      }
    };

  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  const handleMarkAllAsRead =
    async () => {
      try {
        await apiFetch(
          "/Notifications/read-all",
          {
            method: "PUT",
          }
        );

        setNotifications((prev) =>
          prev.map((item) => ({
            ...item,
            isRead: true,
          }))
        );

        setUnreadCount(0);
      } catch (error) {
        console.error(
          "Mark all notifications error:",
          error
        );
      }
    };

  // =====================================================
  // DELETE
  // =====================================================

  const settleLocalFriendNotifications = (friendshipId, action) => {
    const id = Number(friendshipId);
    if (!id) return;
    const accepted = action === "accept" || action === "accepted" || action === "friends";
    setNotifications((prev) =>
      prev.map((item) => {
        const parsed = parseFriendNotification(item.type);
        if (!parsed.isFriendRequest || Number(parsed.friendshipId) !== id) {
          return item;
        }
        return {
          ...item,
          isRead: true,
          type: `FriendRequestSettled:${id}:${accepted ? "accepted" : "rejected"}`,
          message: accepted
            ? "You accepted this friend request."
            : "You rejected this friend request.",
        };
      })
    );
  };

  useEffect(() => {
    return onFriendshipChanged((detail) => {
      if (!detail?.friendshipId) return;
      if (detail.status === "friends" || detail.source === "accept") {
        settleLocalFriendNotifications(detail.friendshipId, "accept");
      }
      if (detail.status === "none" || detail.source === "reject") {
        settleLocalFriendNotifications(detail.friendshipId, "reject");
      }
    });
  }, []);

  const handleFriendAction = async (event, notification, action) => {
    event.stopPropagation();
    const parsed = parseFriendNotification(notification.type);
    if (!parsed.friendshipId) return;

    try {
      if (action === "accept") {
        await acceptFriendRequest(parsed.friendshipId);
      } else {
        await rejectFriendRequest(parsed.friendshipId);
      }

      settleLocalFriendNotifications(parsed.friendshipId, action);

      if (!notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        await apiFetch(`/Notifications/${notification.id}/read`, {
          method: "PUT",
        });
      }
    } catch (error) {
      console.error("Friend request action error:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiFetch(
        `/Notifications/${id}`,
        {
          method: "DELETE",
        }
      );

      setNotifications((prev) =>
        prev.filter(
          (item) => item.id !== id
        )
      );
    } catch (error) {
      console.error(
        "Delete notification error:",
        error
      );
    }
  };

  // =====================================================
  // DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) return "";

    const now = new Date();
    const then = new Date(date);

    const diffMs = now - then;
    const diffSec = Math.floor(
      diffMs / 1000
    );
    const diffMin = Math.floor(
      diffSec / 60
    );
    const diffHr = Math.floor(
      diffMin / 60
    );
    const diffDay = Math.floor(
      diffHr / 24
    );

    if (diffSec < 60) {
      return "just now";
    }

    if (diffMin < 60) {
      return `${diffMin} min${
        diffMin === 1 ? "" : "s"
      } ago`;
    }

    if (diffHr < 24) {
      return `${diffHr} hr${
        diffHr === 1 ? "" : "s"
      } ago`;
    }

    if (diffDay < 7) {
      return `${diffDay} day${
        diffDay === 1 ? "" : "s"
      } ago`;
    }

    return then.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
    });
  };

  // =====================================================
  // INITIALS
  // =====================================================

  const getInitials = (name) => {
    if (!name) return "?";

    const parts =
      name.trim().split(" ");

    const first =
      parts[0]?.[0] || "";

    const last =
      parts.length > 1
        ? parts[parts.length - 1][0]
        : "";

    return (
      first + last
    ).toUpperCase();
  };

  // =====================================================
  // DROPDOWN
  // =====================================================

  const dropdown =
    open && (
      <div
        className={`notification-dropdown${
          isMobile
            ? " is-mobile"
            : ""
        }`}
        role="dialog"
        aria-label="Notifications"
      >

        {/* HEADER */}

        <div className="notification-header">

          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="notification-header-icon"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>

          <h3 className="notification-title">
            Notifications
          </h3>

          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={
                handleMarkAllAsRead
              }
              className="notification-header-action"
              title="Mark all as read"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="18"
                height="18"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
          ) : (
            <span className="notification-header-spacer" />
          )}

          <button
            type="button"
            className="notification-close-btn"
            aria-label="Close notifications"
            onClick={() =>
              setOpen(false)
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="20"
              height="20"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

        </div>

        {/* LIST */}

        <div className="notification-list">

          {notifications.length === 0 ? (

            <div className="notification-empty">

              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="notification-empty-icon"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>

              <p>
                No notifications
              </p>

            </div>

          ) : (

            notifications.map(
              (notification) => (

                <div
                  key={
                    notification.id
                  }
                  onClick={() =>
                    handleNotificationClick(
                      notification
                    )
                  }
                  className={`notification-item ${
                    !notification.isRead
                      ? "unread"
                      : ""
                  }`}
                >

                  <div className="notification-item-inner">

                    {/* AVATAR */}

                    {notification.avatarUrl ? (
                      <img
                        src={
                          notification.avatarUrl
                        }
                        alt={
                          notification.title
                        }
                        className="notification-avatar"
                      />
                    ) : (
                      <div className="notification-avatar notification-avatar-fallback">
                        {getInitials(
                          notification.title
                        )}
                      </div>
                    )}

                    {/* CONTENT */}

                    <div className="notification-content">

                      <div className="notification-content-top">

                        <span className="notification-name">
                          {
                            notification.title
                          }
                        </span>

                      </div>

                      {notification.subtitle && (
                        <p className="notification-subtitle">
                          {
                            notification.subtitle
                          }
                        </p>
                      )}

                      {notification.message && (
                        <p className="notification-message">
                          {
                            notification.message
                          }
                        </p>
                      )}

                      {parseFriendNotification(notification.type).isFriendRequest && (
                        <div className="notification-friend-actions">
                          <button
                            type="button"
                            onClick={(event) =>
                              handleFriendAction(event, notification, "accept")
                            }
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="reject"
                            onClick={(event) =>
                              handleFriendAction(event, notification, "reject")
                            }
                          >
                            Reject
                          </button>
                        </div>
                      )}

                    </div>

                    {/* TIME + DELETE */}

                    <div className="notification-meta">

                      <span className="notification-time">
                        {formatDate(
                          notification.createdAt
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(
                            notification.id
                          );
                        }}
                        className="notification-delete-btn"
                        aria-label="Delete notification"
                      >
                        ×
                      </button>

                    </div>

                  </div>

                </div>

              )
            )

          )}

        </div>

        {/* FOOTER */}

        <div className="notification-footer">

          <button
            type="button"
            className="notification-footer-link"
            onClick={() =>
              setOpen(false)
            }
          >
            See all incoming activity
          </button>

        </div>

      </div>
    );

  // =====================================================
  // RETURN
  // =====================================================

  return (
    <div className="notification-bell">

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();

          setOpen(
            (prev) => !prev
          );
        }}
        className="notification-bell-btn relative p-2 rounded-full transition"
        aria-expanded={open}
        aria-haspopup="dialog"
      >

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`notification-bell-icon w-6 h-6 ${
            ring ? "ring" : ""
          }`}
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* UNREAD BADGE */}

        {unreadCount > 0 && (
          <span className="notification-badge absolute -top-1 -right-1">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}

      </button>

      {isMobile && dropdown
        ? createPortal(
            dropdown,
            document.body
          )
        : dropdown}

    </div>
  );
};