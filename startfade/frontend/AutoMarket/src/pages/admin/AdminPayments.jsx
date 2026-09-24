import "./AdminPayments.css";
import { useEffect, useState } from "react";
import { adminFetch, formatDate } from "./adminApi";

export function AdminPayments() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/payments")
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="admin-payments-page admin-manage-page">
      <h1>Payments</h1>
      <p>Paid Stripe records. These are not deleted from here.</p>
      {error ? <p className="admin-manage-error">{error}</p> : null}
      <div className="admin-manage-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Amount</th>
              <th>Status</th>
              <th>Paid</th>
              <th>Transaction</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.amount != null ? `€${Number(row.amount).toFixed(2)}` : "—"} {row.currency || ""}
                </td>
                <td>{row.status === 2 ? "Paid" : row.status}</td>
                <td>{formatDate(row.paidAt)}</td>
                <td>{row.transactionId || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
