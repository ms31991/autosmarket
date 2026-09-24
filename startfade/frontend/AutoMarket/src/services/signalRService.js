import { io } from "socket.io-client";
import { getClerkToken } from "./clerkToken";
import { API_ORIGIN } from "../config/api";

function createSocketConnection(namespace) {
  let socket = null;
  const listeners = new Map();

  const connection = {
    async start() {
      const token = await getClerkToken();
      socket = io(`${API_ORIGIN}${namespace}`, {
        auth: { token },
        query: { access_token: token },
        transports: ["websocket", "polling"],
        withCredentials: true,
      });

      for (const [event, handlers] of listeners.entries()) {
        for (const handler of handlers) {
          socket.on(event, handler);
        }
      }

      await new Promise((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
      });
    },
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      socket?.on(event, handler);
    },
    off(event, handler) {
      listeners.get(event)?.delete(handler);
      socket?.off(event, handler);
    },
    stop() {
      socket?.disconnect();
      socket = null;
    },
    get state() {
      return socket?.connected ? "Connected" : "Disconnected";
    },
  };

  return connection;
}

export const createChatConnection = () =>
  createSocketConnection("/hubs/chat");

export const createNotificationConnection = () =>
  createSocketConnection("/hubs/notifications");
