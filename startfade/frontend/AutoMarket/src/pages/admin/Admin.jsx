import "./Admin.css";
import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";

export const Admin = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="admin-layout">
      <AdminSidebar collapsed={collapsed} onToggle={setCollapsed} />
      <div className="admin-shell">
        <header className="admin-topbar">
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
