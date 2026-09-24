import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { mediaUrl } from "../utils/mediaUrl";
import "./PublisherChip.css";

export function publisherFrom(item) {
  if (!item) return null;
  const userId =
    item.ownerId ||
    item.userId ||
    item.advertiserId ||
    item.OwnerId ||
    item.AdvertiserId;
  const name = [item.ownerName, item.ownerSurname]
    .filter(Boolean)
    .join(" ")
    .trim() || item.userName || item.sellerName || "";
  if (!userId && !name) return null;
  return {
    userId: userId || null,
    name: name || "User",
    image: item.ownerProfileImage || "",
  };
}

export const PublisherChip = ({
  userId,
  name,
  image,
  className = "",
  variant = "chip",
  subtitle = "View profile",
  menuPlacement = "bottom",
}) => {
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const label = name?.trim() || "User";

  useEffect(() => {
    if (!open || !wrapRef.current) return;

    const place = () => {
      const rect = wrapRef.current.getBoundingClientRect();
      setCoords({
        top: menuPlacement === "top" ? rect.top : rect.bottom,
        left: rect.left,
        up: menuPlacement === "top",
      });
    };

    place();

    const onPointer = (event) => {
      const inWrap = wrapRef.current?.contains(event.target);
      const inMenu = menuRef.current?.contains(event.target);
      if (!inWrap && !inMenu) setOpen(false);
    };

    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, menuPlacement]);

  const initials = label
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  const photo = image ? mediaUrl(image) : "";

  const stopCardNav = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const goToProfile = (event) => {
    stopCardNav(event);
    setOpen(false);
    if (userId) navigate(`/userprofile/${userId}`);
  };

  const toggleMenu = (event) => {
    stopCardNav(event);
    if (!userId) return;
    setOpen((prev) => !prev);
  };

  const photoEl = photo ? (
    <img src={photo} alt={label} className="publisher-chip-photo" />
  ) : (
    <span className="publisher-chip-photo fallback">{initials}</span>
  );

  const menu =
    open && userId && coords
      ? createPortal(
          <div
            ref={menuRef}
            className="publisher-chip-menu portal"
            style={
              coords.up
                ? { left: coords.left, bottom: window.innerHeight - coords.top + 6 }
                : { left: coords.left, top: coords.top + 6 }
            }
            onClick={stopCardNav}
            onMouseDown={stopCardNav}
          >
            <button type="button" onClick={goToProfile} onMouseDown={stopCardNav}>
              View profile
            </button>
          </div>,
          document.body
        )
      : null;

  const wrapProps = {
    ref: wrapRef,
    className: `publisher-chip-wrap ${variant === "card" ? "publisher-card-wrap" : ""} ${className}`,
    onClick: stopCardNav,
    onMouseDown: stopCardNav,
  };

  if (variant === "name") {
    return (
      <div {...wrapProps}>
        <button type="button" className="publisher-name" onClick={toggleMenu} onMouseDown={stopCardNav}>
          {label}
        </button>
        {menu}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div {...wrapProps}>
        <button type="button" className="publisher-card" onClick={toggleMenu} onMouseDown={stopCardNav}>
          {photoEl}
          <span className="publisher-card-text">
            <strong>{label}</strong>
            <em>{subtitle}</em>
          </span>
        </button>
        {menu}
      </div>
    );
  }

  return (
    <div {...wrapProps}>
      <button type="button" className="publisher-chip" onClick={toggleMenu} onMouseDown={stopCardNav}>
        {photoEl}
        {label}
      </button>
      {menu}
    </div>
  );
};
