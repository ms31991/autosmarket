import "./AdminSidebar.css";
import { SITE_LOGO } from "../../config/site";
import { NavLink, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";

const MENU = [
  {
    id: "dashboard",
    label: "Dashboard",
    to: "/admin",
    end: true,
  },
  {
    id: "cars",
    label: "Cars",
    children: [
      { to: "/admin/vehicles", label: "All cars" },
      { to: "/admin/listing-types", label: "Listing types" },
      { to: "/admin/categories", label: "Categories" },
      { to: "/admin/brands", label: "Brands" },
      { to: "/admin/models", label: "Models" },
      { to: "/admin/body-types", label: "Body types" },
      { to: "/admin/fuel-types", label: "Fuel types" },
      { to: "/admin/transmissions", label: "Transmissions" },
      { to: "/admin/drive-types", label: "Drive types" },
      { to: "/admin/conditions", label: "Conditions" },
      { to: "/admin/colors", label: "Colors" },
      { to: "/admin/features", label: "Features" },
    ],
  },
  {
    id: "ads",
    label: "Ads",
    children: [
      { to: "/admin/advertisements", label: "Promoted ads" },
      { to: "/admin/banners", label: "Company banners" },
    ],
  },
  {
    id: "users",
    label: "Users",
    to: "/admin/users",
  },
  {
    id: "commerce",
    label: "Commerce",
    children: [
      { to: "/admin/payments", label: "Payments" },
      { to: "/admin/rental-bookings", label: "Rentals" },
      { to: "/admin/rental-details", label: "Rental details" },
      { to: "/admin/reviews", label: "Reviews" },
    ],
  },
  {
    id: "locations",
    label: "Locations",
    children: [
      { to: "/admin/countries", label: "Countries" },
      { to: "/admin/cities", label: "Cities" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    children: [
      { to: "/admin/notifications", label: "Notifications" },
      { to: "/admin/reports", label: "Listing reports" },
      { to: "/admin/site-settings", label: "Site settings" },
    ],
  },
];

function AdminSidebar({ collapsed, onToggle, mobileOpen, onNavigate }) {
  const location = useLocation();
  const [open, setOpen] = useState(() => ({
    cars: true,
    ads: true,
    commerce: false,
    locations: false,
    tools: false,
  }));

  const currentGroup = useMemo(() => {
    return MENU.find((item) =>
      item.children?.some((child) => location.pathname.startsWith(child.to))
    )?.id;
  }, [location.pathname]);

  function toggleGroup(id) {
    setOpen((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <aside
      className={`wp-sidebar${collapsed ? " collapsed" : ""}${
        mobileOpen ? " mobile-open" : ""
      }`}
    >
      <div className="wp-sidebar-brand">
        <img src={SITE_LOGO} alt="AutoMarket" />
        {!collapsed ? <span>AutoMarket</span> : null}
      </div>

      <nav>
        {MENU.map((item) => {
          if (!item.children) {
            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={Boolean(item.end)}
                className={({ isActive }) =>
                  `wp-menu-item${isActive ? " current" : ""}`
                }
                title={item.label}
                onClick={() => onNavigate?.()}
              >
                <span>{item.label}</span>
              </NavLink>
            );
          }

          const expanded = Boolean(open[item.id] || currentGroup === item.id);
          const childActive = currentGroup === item.id;
          return (
            <div key={item.id} className={`wp-menu-group${childActive ? " current-group" : ""}`}>
              <button
                type="button"
                className={`wp-menu-item wp-menu-parent${childActive ? " current" : ""}`}
                onClick={() => {
                  if (collapsed) onToggle?.(false);
                  toggleGroup(item.id);
                }}
              >
                <span>{item.label}</span>
                {!collapsed ? <em>{expanded ? "▾" : "▸"}</em> : null}
              </button>
              {!collapsed && expanded ? (
                <div className="wp-submenu">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      className={({ isActive }) =>
                        `wp-submenu-item${isActive ? " current" : ""}`
                      }
                      onClick={() => onNavigate?.()}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <button type="button" className="wp-collapse" onClick={() => onToggle?.(!collapsed)}>
        {collapsed ? "»" : "Collapse menu"}
      </button>
      {!collapsed ? (
        <NavLink to="/" className="wp-view-site" onClick={() => onNavigate?.()}>
          View site
        </NavLink>
      ) : null}
    </aside>
  );
}

export default AdminSidebar;
