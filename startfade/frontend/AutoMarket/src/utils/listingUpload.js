import { useSyncExternalStore } from "react";
import { API_BASE } from "../config/api";
import { isNetworkProblem } from "./network";
import { clearPendingListing, endListingPublish } from "./pendingListingDraft";

let job = null;
const listeners = new Set();

export function getListingUpload() {
  return job;
}

export function subscribeListingUpload(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useListingUpload() {
  return useSyncExternalStore(
    subscribeListingUpload,
    getListingUpload,
    getListingUpload
  );
}

function setJob(next) {
  job = next;
  listeners.forEach((fn) => fn(job));
}

function patchJob(partial) {
  if (!job) return;
  setJob({ ...job, ...partial });
}

export function dismissListingUpload() {
  const current = job;
  if (current?.xhr) {
    try {
      current.xhr.abort();
    } catch {
      /* ignore */
    }
  }
  setJob(null);
  endListingPublish();
}

function xhrPost({ url, token, body, onProgress, onXhr }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    onXhr?.(xhr);
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.timeout = 120000;
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(95, Math.round((event.loaded / event.total) * 95)));
    };
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => reject(new Error("Failed to fetch"));
    xhr.ontimeout = () => {
      const err = new Error("timeout");
      err.name = "TimeoutError";
      reject(err);
    };
    xhr.onabort = () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      reject(err);
    };
    xhr.send(body);
  });
}

export function startListingUpload({ name, photoUrl, token, vehicleData, waitFiles }) {
  setJob({
    id: `${Date.now()}`,
    name: name || "Vehicle",
    photoUrl: photoUrl || "",
    progress: 2,
    status: "uploading",
    error: null,
    xhr: null,
  });

  (async () => {
    try {
      const files = await waitFiles();
      if (!files?.length) {
        throw new Error("photos");
      }

      const payload = new FormData();
      payload.append("payload", JSON.stringify(vehicleData));
      files.forEach((file) => payload.append("photos", file));

      const { status, text } = await xhrPost({
        url: `${API_BASE}/Vehicles`,
        token,
        body: payload,
        onProgress: (progress) => patchJob({ progress }),
        onXhr: (xhr) => patchJob({ xhr }),
      });

      if (status < 200 || status >= 300) {
        let message = `Vehicle nuk u krijua. Status: ${status}`;
        try {
          const errorData = JSON.parse(text);
          if (errorData.message) message = errorData.message;
        } catch {
          if (text) message = text;
        }
        throw new Error(message);
      }

      let vehicleId = null;
      try {
        vehicleId = JSON.parse(text)?.vehicleId;
      } catch {
        vehicleId = null;
      }
      if (!vehicleId) {
        throw new Error("Vehicle ID mungon në response.");
      }

      await clearPendingListing();
      patchJob({ progress: 100, status: "done", xhr: null, vehicleId });
      endListingPublish();
    } catch (err) {
      if (err?.name === "AbortError") {
        return;
      }
      patchJob({
        status: "error",
        error: isNetworkProblem(err) ? "internetSlow" : "createFail",
        xhr: null,
      });
      endListingPublish();
    }
  })();
}
