import "./AdminAdvertisments.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminFetch, formatDate } from "./adminApi";

function kindLabel(kind) {
  return kind === "banner" ? "Company banner" : "Homepage listing";
}

export function AdminAdvertisements() {
  const [ads, setAds] = useState([]);
  const [packages, setPackages] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  async function load() {
    try {
      setError("");
      const [adRows, packRows] = await Promise.all([
        adminFetch("/advertisements"),
        adminFetch("/packages"),
      ]);
      setAds(Array.isArray(adRows) ? adRows : []);
      const nextPacks = Array.isArray(packRows) ? packRows : [];
      setPackages(nextPacks);
      setDrafts(
        Object.fromEntries(nextPacks.map((item) => [item.id, String(item.price)]))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function patch(id, body) {
    try {
      setSavingId(id);
      setError("");
      await adminFetch(`/advertisements/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function savePrice(pack) {
    const price = Number(drafts[pack.id]);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid price greater than 0.");
      return;
    }
    try {
      setSavingId(`pkg-${pack.id}`);
      setError("");
      await adminFetch(`/packages/${pack.id}`, {
        method: "PUT",
        body: JSON.stringify({ price }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  const listingPacks = packages.filter((item) => item.kind === "listing");
  const bannerPacks = packages.filter((item) => item.kind === "banner");

  return (
    <div className="admin-manage-page">
      <h1>Ads</h1>
      <p>
        Stop, activate, or delete a promotion. The car listing stays unless you delete it under Cars.
        Change package prices below — checkout uses these amounts.
      </p>
      {error ? <p className="admin-manage-error">{error}</p> : null}

      <h2>Package prices</h2>
      <p>These prices show on the site and are charged in Stripe.</p>
      {[
        { title: "Homepage listings", rows: listingPacks },
        { title: "Company banners", rows: bannerPacks },
      ].map((group) => (
        <div key={group.title} className="admin-package-block">
          <h3>{group.title}</h3>
          <div className="admin-manage-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Package</th>
                  <th>Days</th>
                  <th>Price (€)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((pack) => (
                  <tr key={pack.id}>
                    <td>
                      {pack.name}
                      <span className="admin-package-kind"> {kindLabel(pack.kind)}</span>
                    </td>
                    <td>{pack.days}</td>
                    <td>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={drafts[pack.id] ?? ""}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [pack.id]: event.target.value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-save"
                        disabled={savingId === `pkg-${pack.id}`}
                        onClick={() => savePrice(pack)}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <h2>Live promotions</h2>
      <div className="admin-manage-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ad</th>
              <th>Status</th>
              <th>End</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => (
              <tr key={ad.id}>
                <td>
                  {ad.vehicleId ? (
                    <Link className="admin-car-title" to={`/vehicles/${ad.vehicleId}`}>
                      {[ad.brandName, ad.modelName].filter(Boolean).join(" ") || ad.title || `#${ad.id}`}
                    </Link>
                  ) : (
                    ad.title || `#${ad.id}`
                  )}
                </td>
                <td>{ad.status === 2 ? "Active" : "Stopped"}</td>
                <td>{formatDate(ad.endDate)}</td>
                <td>
                  {ad.status === 2 ? (
                    <button
                      type="button"
                      disabled={savingId === ad.id}
                      onClick={() => patch(ad.id, { status: 1, endDate: new Date().toISOString() })}
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={savingId === ad.id}
                      onClick={() => {
                        const end = new Date();
                        end.setDate(end.getDate() + 7);
                        patch(ad.id, { status: 2, endDate: end.toISOString() });
                      }}
                    >
                      Activate 7 days
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-delete"
                    disabled={savingId === ad.id}
                    onClick={async () => {
                      if (!window.confirm("Delete this ad promotion? The car stays on the site.")) return;
                      try {
                        setSavingId(ad.id);
                        await adminFetch(`/advertisements/${ad.id}`, { method: "DELETE" });
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
