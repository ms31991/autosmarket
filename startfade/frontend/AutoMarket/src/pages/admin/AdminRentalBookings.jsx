import "./AdminRentalBookings.css";
import { useEffect, useState } from "react";
import { adminFetch, formatDate } from "./adminApi";

export function AdminRentalBookings() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/bookings")
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="admin-rental-bookings-page admin-manage-page">
      <h1>Rental bookings</h1>
      <p>Bookings already created remain in the database.</p>
      {error ? <p className="admin-manage-error">{error}</p> : null}
      <div className="admin-manage-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Id</th>
              <th>Status</th>
              <th>Start</th>
              <th>End</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.status ?? row.Status ?? "—"}</td>
                <td>{formatDate(row.startDate || row.StartDate)}</td>
                <td>{formatDate(row.endDate || row.EndDate)}</td>
                <td>{row.totalPrice ?? row.TotalPrice ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
