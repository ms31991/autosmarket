import "./AdminReviews.css";
import { useEffect, useState } from "react";
import { adminFetch, formatDate } from "./adminApi";

export function AdminReviews() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/reviews")
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="admin-reviews-page admin-manage-page">
      <h1>Reviews</h1>
      <p>Existing reviews stay stored. This view only lists them.</p>
      {error ? <p className="admin-manage-error">{error}</p> : null}
      <div className="admin-manage-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Id</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.rating ?? row.Rating ?? "—"}</td>
                <td>{row.comment || row.Comment || "—"}</td>
                <td>{formatDate(row.createdAt || row.CreatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
