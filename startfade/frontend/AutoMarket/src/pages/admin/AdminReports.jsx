import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminFetch, formatDate } from "./adminApi";

export function AdminReports() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      setError("");
      const data = await adminFetch("/listing-reports");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function mark(id, status) {
    try {
      await adminFetch(`/listing-reports/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="admin-manage-page">
      <h1>Listing reports</h1>
      <p>Users flag suspicious vehicles. Review and hide or delete the listing if needed.</p>
      {error ? <p className="admin-manage-error">{error}</p> : null}
      <div className="admin-manage-table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Vehicle</th>
              <th>Reason</th>
              <th>Details</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatDate(row.createdAt)}</td>
                <td>
                  <Link to={`/vehicles/${row.vehicleId}`}>#{row.vehicleId}</Link>
                </td>
                <td>{row.reason}</td>
                <td>{row.details || "—"}</td>
                <td>{Number(row.status) === 1 ? "Reviewed" : "Open"}</td>
                <td>
                  {Number(row.status) === 0 ? (
                    <button type="button" onClick={() => mark(row.id, 1)}>
                      Mark reviewed
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
