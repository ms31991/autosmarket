import "./Admin.css";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";

export const Admin = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className={`admin-layout${menuOpen ? " menu-open" : ""}`}>
      {menuOpen ? (
        <button
          type="button"
          className="admin-menu-backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <AdminSidebar
        collapsed={collapsed}
        onToggle={setCollapsed}
        mobileOpen={menuOpen}
        onNavigate={() => setMenuOpen(false)}
      />
      <div className="admin-shell">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-toggle"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => {
              setCollapsed(false);
              setMenuOpen((open) => !open);
            }}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
          <span>AutoMarket Admin</span>
          <Link to="/">View site</Link>
        </header>
        <main className="admin-content">
          <div className="admin-panel">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
