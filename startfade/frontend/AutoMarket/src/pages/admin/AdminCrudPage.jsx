import { useEffect, useState } from "react";
import { catalogFetch } from "./adminApi";
import { ConfirmCard } from "./ConfirmCard";

export function AdminCrudPage({
  title,
  hint,
  endpoint,
  fields,
  className = "",
}) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [optionLists, setOptionLists] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await catalogFetch(endpoint);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const selects = fields.filter((field) => field.optionsEndpoint);
    Promise.all(
      selects.map(async (field) => [
        field.key,
        await catalogFetch(field.optionsEndpoint).catch(() => []),
      ])
    ).then((entries) => {
      const next = {};
      for (const [key, list] of entries) next[key] = Array.isArray(list) ? list : [];
      setOptionLists(next);
    });
  }, [endpoint]);

  function valueOf(row, key) {
    return row?.[key] ?? row?.[key.charAt(0).toUpperCase() + key.slice(1)] ?? "";
  }

  async function onSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      const body = {};
      for (const field of fields) {
        body[field.key] = form[field.key] ?? "";
      }
      if (editingId != null) {
        body.id = editingId;
        await catalogFetch(`${endpoint}/${editingId}`, { method: "PUT", body });
      } else {
        await catalogFetch(endpoint, { method: "POST", body });
      }
      setForm({});
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    setDeleteId(id);
  }

  async function confirmDelete() {
    const id = deleteId;
    if (id == null) return;
    setDeleteId(null);
    try {
      setError("");
      await catalogFetch(`${endpoint}/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className={className}>
      <h1>{title}</h1>
      <p>{hint}</p>
      {error ? <p className="admin-manage-error">{error}</p> : null}

      <form onSubmit={onSubmit}>
        {fields.map((field) => (
          <label key={field.key}>
            {field.label}
            {field.type === "select" ? (
              <select
                value={form[field.key] ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, [field.key]: event.target.value }))
                }
                disabled={saving}
              >
                <option value="">Select</option>
                {(optionLists[field.key] || []).map((option) => (
                  <option
                    key={option.id ?? option.Id}
                    value={option[field.optionValue || "id"] ?? option.id}
                  >
                    {option[field.optionLabel || "name"] ?? option.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type || "text"}
                value={form[field.key] ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, [field.key]: event.target.value }))
                }
                disabled={saving}
              />
            )}
          </label>
        ))}
        <button type="submit" className="btn-save" disabled={saving}>
          {editingId != null ? "Update" : "Add"}
        </button>
        {editingId != null ? (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({});
            }}
          >
            Cancel
          </button>
        ) : null}
        {editingId != null ? (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm({});
            }}
          >
            Cancel
          </button>
        ) : null}
      </form>

      {loading ? <p>Loading...</p> : null}
      <table>
        <thead>
          <tr>
            <th>ID</th>
            {fields.map((field) => (
              <th key={field.key}>{field.label}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              {fields.map((field) => (
                <td key={field.key}>
                  {String(
                    valueOf(row, field.displayKey || field.key) ||
                      (field.key === "countryId" ? row.countryName : "") ||
                      (field.key === "brandId" ? row.brandName : "") ||
                      "—"
                  )}
                </td>
              ))}
              <td>
                <button
                  type="button"
                  className="btn-edit"
                  onClick={() => {
                    setEditingId(row.id);
                    const next = {};
                    for (const field of fields) {
                      next[field.key] = valueOf(row, field.key);
                    }
                    setForm(next);
                  }}
                >
                  Edit
                </button>
                <button type="button" className="btn-delete" onClick={() => onDelete(row.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ConfirmCard
        open={deleteId != null}
        title="Delete this item?"
        message="This cannot be undone."
        onYes={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
