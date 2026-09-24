import "./AdminDashboard.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminFetch, formatDate } from "./adminApi";

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/stats")
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  const glance = [
    { label: "Cars", value: stats?.vehicles ?? 0, to: "/admin/vehicles" },
    { label: "Users", value: stats?.users ?? 0, to: "/admin/users" },
    { label: "Active ads", value: stats?.activeAds ?? 0, to: "/admin/advertisements" },
    { label: "Banners", value: stats?.activeBanners ?? 0, to: "/admin/banners" },
    { label: "Payments", value: stats?.paidPayments ?? 0, to: "/admin/payments" },
    { label: "Reviews", value: stats?.reviews ?? 0, to: "/admin/reviews" },
    { label: "Open reports", value: stats?.openReports ?? 0, to: "/admin/reports" },
  ];

  return (
    <div className="wp-dashboard">
      <h1>Dashboard</h1>
      {error ? <p className="admin-manage-error">{error}</p> : null}

      <section className="wp-welcome">
        <h2>Welcome to AutoMarket</h2>
        <p>Manage cars, ads, users and catalog from this panel — like WordPress, for your marketplace.</p>
        <div className="wp-welcome-actions">
          <Link className="wp-primary" to="/admin/vehicles">
            Manage cars
          </Link>
          <Link to="/admin/advertisements">Manage ads</Link>
          <Link to="/admin/categories">Manage categories</Link>
          <Link to="/admin/users">Manage users</Link>
        </div>
      </section>

      <div className="wp-dash-grid">
        <section className="wp-widget">
          <h2>At a Glance</h2>
          <ul>
            {glance.map((item) => (
              <li key={item.label}>
                <Link to={item.to}>
                  <strong>{item.value}</strong> {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="wp-widget">
          <h2>Activity</h2>
          <p>Recently published cars</p>
          <ul>
            {(stats?.recentVehicles || []).map((car) => (
              <li key={car.id}>
                <Link to={`/vehicles/${car.id}`}>
                  {[car.brandName, car.modelName].filter(Boolean).join(" ") || `Car #${car.id}`}
                </Link>
                <span>{formatDate(car.createdDate)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
