const rooms = {
  chat: new Map(),
  notifications: new Map(),
};

function add(map, userId, socket) {
  if (!map.has(userId)) map.set(userId, new Set());
  map.get(userId).add(socket);
}

function remove(map, userId, socket) {
  const set = map.get(userId);
  if (!set) return;
  set.delete(socket);
  if (set.size === 0) map.delete(userId);
}

export function emitToUser(kind, userId, event, payload) {
  const keys = [...new Set([userId, userId != null ? String(userId) : null].filter(Boolean))];
  for (const key of keys) {
    const set = rooms[kind]?.get(key);
    if (!set) continue;
    for (const socket of set) {
      socket.emit(event, payload);
    }
  }
}

export function attachSockets(io, verifyAndProvision) {
  function bind(namespace, kind) {
    io.of(namespace).use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.query?.access_token ||
          (socket.handshake.headers.authorization || "").replace("Bearer ", "");
        if (!token) return next(new Error("unauthorized"));
        const user = await verifyAndProvision(token);
        if (!user) return next(new Error("unauthorized"));
        socket.user = user;
        next();
      } catch {
        next(new Error("unauthorized"));
      }
    });

    io.of(namespace).on("connection", (socket) => {
      add(rooms[kind], String(socket.user.id), socket);
      if (socket.user.clerkUserId && String(socket.user.clerkUserId) !== String(socket.user.id)) {
        add(rooms[kind], String(socket.user.clerkUserId), socket);
      }
      socket.on("disconnect", () => {
        remove(rooms[kind], String(socket.user.id), socket);
        if (socket.user.clerkUserId) {
          remove(rooms[kind], String(socket.user.clerkUserId), socket);
        }
      });
    });
  }

  bind("/hubs/chat", "chat");
  bind("/hubs/notifications", "notifications");
}
