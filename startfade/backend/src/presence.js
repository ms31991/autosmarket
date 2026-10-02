const OPEN_MS = 20000;
const openUntil = new Map();
const mailedWhileAway = new Set();

function key(userId) {
  return String(userId || "").trim();
}

export function markChatOpen(userId) {
  const id = key(userId);
  if (!id) return;
  openUntil.set(id, Date.now() + OPEN_MS);
  mailedWhileAway.delete(id);
}

export function markChatClosed(userId) {
  const id = key(userId);
  if (!id) return;
  openUntil.delete(id);
}

export function isChatOpen(userId) {
  const id = key(userId);
  if (!id) return false;
  const until = openUntil.get(id);
  if (!until) return false;
  if (until < Date.now()) {
    openUntil.delete(id);
    return false;
  }
  return true;
}

export function alreadyMailedWhileAway(userId) {
  return mailedWhileAway.has(key(userId));
}

export function markMailedWhileAway(userId) {
  const id = key(userId);
  if (id) mailedWhileAway.add(id);
}

export function clearMailedWhileAway(userId) {
  mailedWhileAway.delete(key(userId));
}
