const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1920;

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

export async function compressImageFile(file, maxBytes = MAX_BYTES) {
  if (!file || file.size <= maxBytes) return file;

  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;
  if (Math.max(width, height) > MAX_EDGE) {
    const scale = MAX_EDGE / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  let quality = 0.88;
  let blob = null;

  const draw = () => {
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(bitmap, 0, 0, width, height);
  };

  draw();
  blob = await canvasToBlob(canvas, quality);
  while (blob && blob.size > maxBytes && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, quality);
  }
  while (blob && blob.size > maxBytes && Math.max(width, height) > 720) {
    width = Math.round(width * 0.82);
    height = Math.round(height * 0.82);
    draw();
    blob = await canvasToBlob(canvas, 0.72);
  }

  bitmap.close?.();
  if (!blob || blob.size > maxBytes) {
    throw new Error("Fotoja nuk u kompresua nën 5 MB.");
  }
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
