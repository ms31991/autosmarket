const DB_NAME = "automarket-drafts";
const STORE = "pending";
const KEY = "add-vehicle";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function asFile(blob, index) {
  if (blob instanceof File) return blob;
  const type = blob?.type || "image/jpeg";
  const name = blob?.name || `photo-${index + 1}.jpg`;
  return new File([blob], name, { type });
}

export async function savePendingListing(draft) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(draft, KEY);
  });
  db.close();
}

export async function loadPendingListing() {
  const db = await openDb();
  const draft = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (!draft) return null;
  return {
    ...draft,
    images: Array.isArray(draft.images)
      ? draft.images.map((item, index) => {
          if (item instanceof File || item instanceof Blob) {
            return { file: asFile(item, index), status: "ready" };
          }
          return {
            file: asFile(item?.file || item, index),
            status: "ready",
            thumb: item?.thumb ? asFile(item.thumb, index) : null,
          };
        })
      : [],
  };
}

export async function clearPendingListing() {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(KEY);
  });
  db.close();
}

export function safeAppPath(value, fallback = "/") {
  if (!value || !String(value).startsWith("/") || String(value).startsWith("//")) {
    return fallback;
  }
  return String(value);
}

let listingPublishLock = false;

export function tryBeginListingPublish() {
  if (listingPublishLock) return false;
  listingPublishLock = true;
  return true;
}

export function endListingPublish() {
  listingPublishLock = false;
}
