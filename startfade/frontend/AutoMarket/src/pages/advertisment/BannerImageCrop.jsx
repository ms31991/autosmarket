import { useEffect, useMemo, useRef, useState } from "react";

export const BANNER_SLOT = { width: 1400, height: 240 };

function baseScale(image, mode) {
  const fit = Math.min(
    BANNER_SLOT.width / image.naturalWidth,
    BANNER_SLOT.height / image.naturalHeight
  );
  const fill = Math.max(
    BANNER_SLOT.width / image.naturalWidth,
    BANNER_SLOT.height / image.naturalHeight
  );
  return mode === "fill" ? fill : fit;
}

export function defaultPlacement() {
  return { mode: "fit", zoom: 1, ox: 0, oy: 0 };
}

function layout(image, placement) {
  const scale = baseScale(image, placement.mode) * placement.zoom;
  const drawW = image.naturalWidth * scale;
  const drawH = image.naturalHeight * scale;
  return {
    scale,
    drawW,
    drawH,
    x: (BANNER_SLOT.width - drawW) / 2 + placement.ox,
    y: (BANNER_SLOT.height - drawH) / 2 + placement.oy,
  };
}

function clampPlacement(image, placement) {
  const next = { ...placement, zoom: Math.min(3, Math.max(0.5, placement.zoom)) };
  const drawn = layout(image, next);
  if (next.mode === "fill") {
    const minX = Math.min(0, BANNER_SLOT.width - drawn.drawW);
    const maxX = Math.max(0, BANNER_SLOT.width - drawn.drawW);
    const minY = Math.min(0, BANNER_SLOT.height - drawn.drawH);
    const maxY = Math.max(0, BANNER_SLOT.height - drawn.drawH);
    const x = Math.min(maxX, Math.max(minX, drawn.x));
    const y = Math.min(maxY, Math.max(minY, drawn.y));
    next.ox = x - (BANNER_SLOT.width - drawn.drawW) / 2;
    next.oy = y - (BANNER_SLOT.height - drawn.drawH) / 2;
  }
  return next;
}

export function cropBannerFile(image, placement = defaultPlacement()) {
  const ready = clampPlacement(image, placement);
  const drawn = layout(image, ready);
  const canvas = document.createElement("canvas");
  canvas.width = BANNER_SLOT.width;
  canvas.height = BANNER_SLOT.height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, drawn.x, drawn.y, drawn.drawW, drawn.drawH);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not crop the image."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}

export function BannerSlotPreview({ src, placement, image, className = "" }) {
  const style = useMemo(() => {
    if (!image?.naturalWidth) return { opacity: 0 };
    const drawn = layout(image, clampPlacement(image, placement || defaultPlacement()));
    return {
      width: `${(drawn.drawW / BANNER_SLOT.width) * 100}%`,
      height: `${(drawn.drawH / BANNER_SLOT.height) * 100}%`,
      left: `${(drawn.x / BANNER_SLOT.width) * 100}%`,
      top: `${(drawn.y / BANNER_SLOT.height) * 100}%`,
    };
  }, [image, placement]);

  return (
    <div className={`banner-slot-preview ${className}`.trim()}>
      <img src={src} alt="" draggable={false} style={style} />
    </div>
  );
}

export function BannerImageCrop({
  src,
  placement,
  onPlacementChange,
  onConfirm,
  onCancel,
  title,
  hint,
  fitLabel,
  fillLabel,
  zoomLabel,
  confirmLabel,
  cancelLabel,
}) {
  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const [image, setImage] = useState(null);

  useEffect(() => {
    const next = new Image();
    next.onload = () => setImage(next);
    next.src = src;
  }, [src]);

  function update(partial) {
    if (!image) return;
    onPlacementChange(clampPlacement(image, { ...placement, ...partial }));
  }

  function onPointerDown(event) {
    if (!image) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const frame = frameRef.current.getBoundingClientRect();
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      ox: placement.ox,
      oy: placement.oy,
      ratio: BANNER_SLOT.width / frame.width,
    };
  }

  function onPointerMove(event) {
    const drag = dragRef.current;
    if (!drag) return;
    update({
      ox: drag.ox + (event.clientX - drag.x) * drag.ratio,
      oy: drag.oy + (event.clientY - drag.y) * drag.ratio,
    });
  }

  function onPointerUp(event) {
    if (dragRef.current) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  }

  function onWheel(event) {
    if (!image) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    update({ zoom: placement.zoom + delta });
  }

  return (
    <div className="banner-crop-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="banner-crop-card">
        <h2>{title}</h2>
        <p className="banner-crop-hint">{hint}</p>
        <div className="banner-crop-types">
          <button
            type="button"
            className={placement.mode === "fit" ? "selected" : ""}
            onClick={() => update({ mode: "fit", ox: 0, oy: 0, zoom: 1 })}
          >
            {fitLabel}
          </button>
          <button
            type="button"
            className={placement.mode === "fill" ? "selected" : ""}
            onClick={() => update({ mode: "fill", ox: 0, oy: 0, zoom: 1 })}
          >
            {fillLabel}
          </button>
        </div>
        <div className="banner-page-frame-label">AutoMarket</div>
        <div
          ref={frameRef}
          className="banner-page-frame"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <BannerSlotPreview src={src} placement={placement} image={image} />
        </div>
        <label className="banner-zoom">
          <span>{zoomLabel}</span>
          <input
            type="range"
            min="50"
            max="300"
            value={Math.round(placement.zoom * 100)}
            onChange={(event) => update({ zoom: Number(event.target.value) / 100 })}
          />
        </label>
        <div className="banner-crop-actions">
          <button type="button" className="banner-crop-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="banner-crop-confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
