import { useEffect, useRef, useState } from "react";
import { colorToCss, isLightColor } from "../utils/colorCss";

export function ColorSelect({
  id,
  name = "colorId",
  value,
  colors = [],
  placeholder,
  disabled,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = colors.find((color) => Number(color.id) === Number(value));

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function pick(next) {
    onChange({ target: { name, value: next } });
    setOpen(false);
  }

  return (
    <div className="color-select" ref={rootRef}>
      <button
        id={id}
        type="button"
        className="color-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{selected?.name || placeholder}</span>
      </button>
      {open ? (
        <ul className="color-select-list" role="listbox">
          {colors.map((color) => {
            const css = colorToCss(color);
            const active = Number(color.id) === Number(value);
            return (
              <li key={color.id}>
                <button
                  type="button"
                  className={`color-select-item${active ? " is-active" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(String(color.id))}
                >
                  <span>{color.name}</span>
                  <span
                    className={`color-dot${css ? "" : " is-empty"}${
                      isLightColor(css) ? " is-light" : ""
                    }`}
                    style={css ? { backgroundColor: css } : undefined}
                    aria-hidden="true"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
