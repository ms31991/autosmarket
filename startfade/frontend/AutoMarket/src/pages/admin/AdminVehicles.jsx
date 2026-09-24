import "./AdminVehicles.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminFetch, catalogFetch, formatDate } from "./adminApi";

export function AdminVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [listingTypes, setListingTypes] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  async function load() {
    try {
      setError("");
      const [rows, types] = await Promise.all([
        adminFetch("/vehicles"),
        catalogFetch("/ListingTypes").catch(() => []),
      ]);
      const list = Array.isArray(rows) ? rows : [];
      setVehicles(list);
      setListingTypes(Array.isArray(types) ? types : []);
      const next = {};
      for (const vehicle of list) {
        next[vehicle.id] = {
          price: vehicle.price ?? "",
          year: vehicle.year ?? "",
          mileage: vehicle.mileage ?? "",
          listingTypeId: vehicle.listingTypeId ?? "",
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
      const draft = drafts[id] || {};
      await adminFetch(`/vehicles/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          price: draft.price,
          year: draft.year,
          mileage: draft.mileage,
          listingTypeId: draft.listingTypeId || null,
        }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="admin-vehicles-page admin-manage-page">
      <h1>Cars</h1>
      <p>All published cars. Save edits, open full edit, or delete a listing if you choose.</p>
      {error ? <p className="admin-manage-error">{error}</p> : null}
      <div className="admin-manage-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Type</th>
              <th>Price</th>
              <th>Year</th>
              <th>Mileage</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => {
              const draft = drafts[vehicle.id] || {};
              return (
                <tr key={vehicle.id}>
                  <td>
                    <Link className="admin-car-title" to={`/vehicles/${vehicle.id}`}>
                      {[vehicle.brandName, vehicle.modelName].filter(Boolean).join(" ") ||
                        `#${vehicle.id}`}
                    </Link>
                  </td>
                  <td>
                    <select
                      value={draft.listingTypeId}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [vehicle.id]: { ...draft, listingTypeId: event.target.value },
                        }))
                      }
                    >
                      <option value="">—</option>
                      {listingTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={draft.price}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [vehicle.id]: { ...draft, price: event.target.value },
                        }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={draft.year}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [vehicle.id]: { ...draft, year: event.target.value },
                        }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={draft.mileage}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [vehicle.id]: { ...draft, mileage: event.target.value },
                        }))
                      }
                    />
                  </td>
                  <td>{formatDate(vehicle.createdDate)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-save"
                      disabled={savingId === vehicle.id}
                      onClick={() => save(vehicle.id)}
                    >
                      Save
                    </button>
                    <Link className="admin-edit-link" to={`/edit-vehicle/${vehicle.id}`}>
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="btn-delete"
                      disabled={savingId === vehicle.id}
                      onClick={async () => {
                        const name =
                          [vehicle.brandName, vehicle.modelName].filter(Boolean).join(" ") ||
                          `#${vehicle.id}`;
                        if (!window.confirm(`Delete this car from the site?\n${name}`)) return;
                        try {
                          setSavingId(vehicle.id);
                          setError("");
                          await adminFetch(`/vehicles/${vehicle.id}`, { method: "DELETE" });
                          await load();
                        } catch (err) {
                          setError(err.message);
                        } finally {
                          setSavingId(null);
                        }
                      }}
                    >
                      Delete
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
