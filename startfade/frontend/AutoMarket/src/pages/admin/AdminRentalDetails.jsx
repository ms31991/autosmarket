import "./AdminRentalDetails.css";
import { useEffect, useState } from "react";
import { adminFetch } from "./adminApi";

export function AdminRentalDetails() {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  async function load() {
    try {
      setError("");
      const data = await adminFetch("/rental-details");
      const list = Array.isArray(data) ? data : [];
      setRows(list);
      const next = {};
      for (const row of list) {
        next[row.id] = {
          pricePerDay: row.pricePerDay ?? "",
          deposit: row.deposit ?? "",
        };
      }
      setDrafts(next);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(id) {
    try {
      setSavingId(id);
      setError("");
      await adminFetch(`/rental-details/${id}`, {
        method: "PUT",
        body: drafts[id],
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="admin-rental-details-page admin-manage-page">
      <h1>Rental details</h1>
      <p>Edit daily price and deposit for rental cars.</p>
      {error ? <p className="admin-manage-error">{error}</p> : null}
      <div className="admin-manage-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Car</th>
              <th>Price / day</th>
              <th>Deposit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const draft = drafts[row.id] || {};
              return (
                <tr key={row.id}>
                  <td>
                    {[row.brandName, row.modelName].filter(Boolean).join(" ") ||
                      `Vehicle ${row.vehicleId || row.id}`}
                  </td>
                  <td>
                    <input
                      type="number"
                      value={draft.pricePerDay}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.id]: { ...draft, pricePerDay: event.target.value },
                        }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={draft.deposit}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [row.id]: { ...draft, deposit: event.target.value },
                        }))
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-save"
                      disabled={savingId === row.id}
                      onClick={() => save(row.id)}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
