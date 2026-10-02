const TARGET_FULL = 380 * 1024;
const TARGET_THUMB = 85 * 1024;
const EDGE_FULL = 1600;
const EDGE_THUMB = 720;

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

function sized(bitmap, maxEdge) {
  let width = bitmap.width;
  let height = bitmap.height;
  const longest = Math.max(width, height);
  if (longest > maxEdge) {
    const scale = maxEdge / longest;
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }
  return { width, height };
}

async function encodeJpeg(bitmap, maxEdge, maxBytes) {
  let { width, height } = sized(bitmap, maxEdge);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let quality = 0.82;

  const draw = () => {
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(bitmap, 0, 0, width, height);
  };

  draw();
  let blob = await canvasToBlob(canvas, quality);
  while (blob && blob.size > maxBytes && quality > 0.48) {
    quality -= 0.08;
    blob = await canvasToBlob(canvas, quality);
  }
  while (blob && blob.size > maxBytes && Math.max(width, height) > 480) {
    width = Math.max(1, Math.round(width * 0.82));
    height = Math.max(1, Math.round(height * 0.82));
    draw();
    blob = await canvasToBlob(canvas, 0.7);
  }
  if (!blob) throw new Error("Fotoja nuk u kompresua.");
  return blob;
}

function asJpegFile(blob, originalName, prefix = "") {
  const base = String(originalName || "photo").replace(/\.[^.]+$/, "");
  return new File([blob], `${prefix}${base}.jpg`, { type: "image/jpeg" });
}

export async function prepareListingPhoto(file) {
  if (!file) throw new Error("Nuk u zgjodh foto.");
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("Fotoja është shumë e madhe.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const fullBlob = await encodeJpeg(bitmap, EDGE_FULL, TARGET_FULL);
    const thumbBlob = await encodeJpeg(bitmap, EDGE_THUMB, TARGET_THUMB);
    return {
      file: asJpegFile(fullBlob, file.name),
      thumb: asJpegFile(thumbBlob, file.name, "t-"),
    };
  } finally {
    bitmap.close?.();
  }
}

export async function compressImageFile(file) {
  const prepared = await prepareListingPhoto(file);
  return prepared.file;
}
