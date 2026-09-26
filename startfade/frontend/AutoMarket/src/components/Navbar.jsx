import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState,useRef } from "react";
import {
FiLogIn,
FiUserPlus,
FiUser,
FiLogOut,
} from "react-icons/fi";
import { useAuth } from "@clerk/clerk-react";
import { useAuth as useAppAuth } from "../context/AuthContext";
import { NotificationBell } from "../pages/NotificationBell";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "../i18n/LanguageContext";
import { SITE_LOGO } from "../config/site";
import "./Navbar.css";


export const Navbar = () => {
const navigate = useNavigate();
const location = useLocation();
const { isSignedIn, signOut } = useAuth();
const { dbUser } = useAppAuth();
const { t } = useLanguage();
const isAdmin = (dbUser?.roleName || dbUser?.RoleName) === "Admin";


const [notificationsOpen, setNotificationsOpen] =
  useState(false);

const notificationWrapperRef =
  useRef(null);

const isHome = location.pathname === "/";
const isInbox = location.pathname.startsWith("/messages");
const isAdd = location.pathname.startsWith("/add-vehicle");

const isProfile = isSignedIn
? location.pathname.startsWith("/userprofile")
: location.pathname === "/login";

const [isMobile, setIsMobile] = useState(
() =>
typeof window !== "undefined" &&
window.matchMedia("(max-width: 768px)").matches
);

useEffect(() => {
const mq = window.matchMedia("(max-width: 768px)");

const sync = () => setIsMobile(mq.matches);

mq.addEventListener("change", sync);

return () => mq.removeEventListener("change", sync);

}, []);

useEffect(() => {
  setNotificationsOpen(false);
}, [location.pathname]);

useEffect(() => {
  setNotificationsOpen(false);
}, [location.pathname]);

async function handleLogout() {
await signOut();
navigate("/login");
}

return (
<>
{!isMobile && (
<nav className="navbar" aria-label="Main">
<div className="navbar-inner">

        {/* Logo */}
        <Link to="/" className="navbar-logo" aria-label="AutoMarket home">
          <img src={SITE_LOGO} alt="AutoMarket" />
        </Link>

        {/* User Actions */}
        <div className="navbar-actions">
          <LanguageSwitcher variant="desktop" />

          {!isSignedIn ? (
            <>
              {/* Login */}
              <Link to="/login" className="login-link">
                <FiLogIn />
                <span>{t("navLogin")}</span>
              </Link>

              {/* Register */}
              <Link to="/register" className="register-link">
                <FiUserPlus />
                <span>{t("navRegister")}</span>
              </Link>
            </>
          ) : (
            <>
              {/* Notifications / Updates */}

<div
  ref={notificationWrapperRef}
  className="notification-wrapper nav-icon-link"
  role="button"
  tabIndex={0}
  aria-expanded={notificationsOpen}
  aria-label={t("navUpdates")}
  onClick={() =>
    setNotificationsOpen(
      (prev) => !prev
    )
  }
  onKeyDown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setNotificationsOpen((prev) => !prev);
    }
  }}
>
  <NotificationBell
    open={notificationsOpen}
    setOpen={setNotificationsOpen}
    notificationWrapperRef={
      notificationWrapperRef
    }
  />

  <span>{t("navUpdates")}</span>
</div>
              {/* Inbox */}
              <Link
                to="/messages"
                className="nav-icon-link"
                title={t("navInbox")}
              >
                <svg
                  className="mobile-nav-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect
                    x="3.5"
                    y="5"
                    width="17"
                    height="14"
                    rx="2.2"
                  />

                  <path d="m4.5 7 7.5 6 7.5-6" />
                </svg>

                <span>{t("navInbox")}</span>
              </Link>

              {isAdmin ? (
                <Link to="/admin" className="nav-icon-link" title="Admin">
                  <span>Admin</span>
                </Link>
              ) : null}

              {/* Profile */}
              <Link
                to="/userprofile"
                className="profile-link"
              >
                <div className="profile-avatar">
                  <FiUser />
                </div>

                <span className="profile-text">
                  {t("navProfile")}
                </span>
              </Link>

              {/* Logout */}
              <button
                type="button"
                className="logout-button"
                onClick={handleLogout}
              >
                <FiLogOut />
                <span>{t("navLogout")}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )}

  {isMobile && <LanguageSwitcher variant="mobile" />}

  {/* MOBILE NAVIGATION */}
  {isMobile && (
    <nav
      className="mobile-bottom-nav"
      aria-label="Mobile navigation"
    >

      {/* Home */}
      <NavLink
        to="/"
        end
        className={() =>
          `mobile-nav-item${isHome ? " active" : ""}`
        }
        onClick={() => setNotificationsOpen(false)}
      >
        <svg
          className="mobile-nav-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 10.5 12 4l8 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20z" />

          <path d="M9.5 21.5v-7h5v7" />
        </svg>

        <span>{t("navHome")}</span>
      </NavLink>

      {/* Inbox */}
      <NavLink
        to={isSignedIn ? "/messages" : "/login"}
        className={() =>
          `mobile-nav-item${isInbox ? " active" : ""}`
        }
        onClick={() => setNotificationsOpen(false)}
      >
        <svg
          className="mobile-nav-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect
            x="3.5"
            y="5"
            width="17"
            height="14"
            rx="2.2"
          />

          <path d="m4.5 7 7.5 6 7.5-6" />
        </svg>

        <span>{t("navInbox")}</span>
      </NavLink>

      {/* Add Vehicle */}
      <NavLink
        to={isSignedIn ? "/add-vehicle" : "/login"}
        className={() =>
          `mobile-nav-center${isAdd ? " active" : ""}`
        }
        aria-label={t("navAdd")}
        onClick={() => setNotificationsOpen(false)}
      >
        <span className="mobile-nav-center-btn">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </NavLink>

      {/* Updates */}
      {isSignedIn ? (
        <div
          ref={notificationWrapperRef}
          className="mobile-nav-item mobile-nav-updates"
          onClick={() =>
            setNotificationsOpen((prev) => !prev)
          }
        >
          <NotificationBell
            open={notificationsOpen}
            setOpen={setNotificationsOpen}
            notificationWrapperRef={notificationWrapperRef}
          />
          <span>{t("navUpdates")}</span>
        </div>
      ) : (
        <NavLink
          to="/login"
          className="mobile-nav-item"
        >
          <svg
            className="mobile-nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />

            <path d="M13.73 21a2 2 0 0 1-3.46 0" />

            <path d="M2.5 10.5 4 9l-1.5-1.5" />

            <path d="M21.5 10.5 20 9l1.5-1.5" />
          </svg>

          <span>{t("navUpdates")}</span>
        </NavLink>
      )}

      {/* Profile */}
      <NavLink
        to={isSignedIn ? "/userprofile" : "/login"}
        className={() =>
          `mobile-nav-item${isProfile ? " active" : ""}`
        }
        onClick={() => setNotificationsOpen(false)}
      >
        <svg
          className="mobile-nav-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="3.2" />

          <path d="M5.5 19.2c.9-3.1 3.4-4.7 6.5-4.7s5.6 1.6 6.5 4.7" />
        </svg>

        <span>
          {isSignedIn ? t("navProfile") : t("navLogin")}
        </span>
      </NavLink>
    </nav>
  )}
</>

);
}