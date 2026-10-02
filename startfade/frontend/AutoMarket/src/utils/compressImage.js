const TARGET_FULL = 380 * 1024;
const EDGE_FULL = 1600;

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

async function encodeJpeg(bitmap, maxBytes) {
  let width = bitmap.width;
  let height = bitmap.height;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  let quality = 0.8;

  const draw = () => {
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(bitmap, 0, 0, width, height);
  };

  draw();
  let blob = await canvasToBlob(canvas, quality);
  while (blob && blob.size > maxBytes && quality > 0.5) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }
  while (blob && blob.size > maxBytes && Math.max(width, height) > 640) {
    width = Math.max(1, Math.round(width * 0.85));
    height = Math.max(1, Math.round(height * 0.85));
    draw();
    blob = await canvasToBlob(canvas, 0.72);
  }
  if (!blob) throw new Error("Fotoja nuk u kompresua.");
  return blob;
}

function asJpegFile(blob, originalName) {
  const base = String(originalName || "photo").replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

export async function prepareListingPhoto(file) {
  if (!file) throw new Error("Nuk u zgjodh foto.");
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("Fotoja është shumë e madhe.");
  }

  const original = await createImageBitmap(file);
  const { width, height } = sized(original, EDGE_FULL);
  const alreadySmall =
    file.type === "image/jpeg" &&
    file.size <= TARGET_FULL &&
    original.width <= EDGE_FULL &&
    original.height <= EDGE_FULL;
  if (alreadySmall) {
    original.close?.();
    return { file };
  }

  let bitmap = original;
  if (original.width !== width || original.height !== height) {
    try {
      bitmap = await createImageBitmap(original, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: "medium",
      });
      original.close?.();
    } catch {
      bitmap = original;
    }
  }

  try {
    const fullBlob = await encodeJpeg(bitmap, TARGET_FULL);
    return { file: asJpegFile(fullBlob, file.name) };
  } finally {
    bitmap.close?.();
  }
}

export async function compressImageFile(file) {
  const prepared = await prepareListingPhoto(file);
  return prepared.file;
}
