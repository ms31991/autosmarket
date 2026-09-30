import { io } from "socket.io-client";
import { getClerkToken } from "./clerkToken";
import { API_ORIGIN } from "../config/api";

function waitUntilConnected(socket, ms = 20000) {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Realtime connection timed out"));
    }, ms);
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      socket.off("connect", onConnect);
    };
    socket.once("connect", onConnect);
  });
}

function emitLocal(listeners, event, payload) {
  const handlers = listeners.get(event);
  if (!handlers) return;
  for (const handler of handlers) {
    handler(payload);
  }
}

function createSocketConnection(namespace) {
  let socket = null;
  let everConnected = false;
  const listeners = new Map();

  function bindSocketEvents() {
    if (!socket) return;
    for (const [event, handlers] of listeners.entries()) {
      if (event === "reconnected") continue;
      for (const handler of handlers) {
        socket.off(event, handler);
        socket.on(event, handler);
      }
    }
  }

  const connection = {
    async start() {
      if (socket?.connected) return;

      if (socket && !socket.connected) {
        socket.connect();
        await waitUntilConnected(socket);
        return;
      }

      socket = io(`${API_ORIGIN}${namespace}`, {
        auth: (cb) => {
          getClerkToken()
            .then((token) => cb({ token: token || "" }))
            .catch(() => cb({ token: "" }));
        },
        transports: ["websocket", "polling"],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 400,
        reconnectionDelayMax: 4000,
        timeout: 20000,
      });

      socket.on("connect", () => {
        if (everConnected) {
          emitLocal(listeners, "reconnected");
        }
        everConnected = true;
      });

      bindSocketEvents();
      await waitUntilConnected(socket);
    },
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      if (event !== "reconnected") {
        socket?.on(event, handler);
      }
    },
    off(event, handler) {
      listeners.get(event)?.delete(handler);
      if (event !== "reconnected") {
        socket?.off(event, handler);
      }
    },
    stop() {
      everConnected = false;
      socket?.removeAllListeners();
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

export function subscribeRealtimeWake(onWake) {
  let last = 0;
  const run = (force = false) => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    const now = Date.now();
    if (!force && now - last < 1200) return;
    last = now;
    onWake();
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") run(true);
  };

  window.addEventListener("focus", onVisible);
  window.addEventListener("online", onVisible);
  window.addEventListener("pageshow", onVisible);
  document.addEventListener("visibilitychange", onVisible);
  const poll = window.setInterval(() => run(false), 10000);

  return () => {
    window.removeEventListener("focus", onVisible);
    window.removeEventListener("online", onVisible);
    window.removeEventListener("pageshow", onVisible);
    document.removeEventListener("visibilitychange", onVisible);
    window.clearInterval(poll);
  };
}
