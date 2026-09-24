import { useEffect, useState } from "react";
import { adminFetch, formatDate } from "./adminApi";

export function AdminCompanyBanners() {
  const [banners, setBanners] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  async function load() {
    try {
      setError("");
      const rows = await adminFetch("/banners");
      const list = Array.isArray(rows) ? rows : [];
      setBanners(list);
      const next = {};
      for (const banner of list) {
        next[banner.id] = {
          companyName: banner.companyName || "",
          targetUrl: banner.targetUrl || "",
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

  async function save(id, extra = {}) {
    try {
      setSavingId(id);
      setError("");
      const draft = drafts[id] || {};
      await adminFetch(`/banners/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          companyName: draft.companyName,
          targetUrl: draft.targetUrl,
          ...extra,
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
    <div className="admin-manage-page">
      <h1>Company banners</h1>
      <p>Edit company name and link. Stopping a banner does not delete the payment record.</p>
      {error ? <p className="admin-manage-error">{error}</p> : null}
      <div className="admin-manage-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Link</th>
              <th>Status</th>
              <th>End</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {banners.map((banner) => {
              const draft = drafts[banner.id] || {};
              return (
                <tr key={banner.id}>
                  <td>
                    <input
                      value={draft.companyName}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [banner.id]: { ...draft, companyName: event.target.value },
                        }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      value={draft.targetUrl}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [banner.id]: { ...draft, targetUrl: event.target.value },
                        }))
                      }
                    />
                  </td>
                  <td>{banner.status === 2 ? "Active" : "Stopped"}</td>
                  <td>{formatDate(banner.endDate)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-save"
                      disabled={savingId === banner.id}
                      onClick={() => save(banner.id)}
                    >
                      Save
                    </button>
                    {banner.status === 2 ? (
                      <button
                        type="button"
                        disabled={savingId === banner.id}
                        onClick={() =>
                          save(banner.id, { status: 1, endDate: new Date().toISOString() })
                        }
                      >
                        Stop
                      </button>
                    ) : null}
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
