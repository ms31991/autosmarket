import { useState } from "react";
import "./AdminCities.css";
import { AdminCrudPage } from "./AdminCrudPage";
import { catalogFetch } from "./adminApi";

export const AdminCities = () => {
  const [reloadKey, setReloadKey] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function syncFromApi() {
    try {
      setSyncing(true);
      setError("");
      setMessage("Loading cities from API...");
      const result = await catalogFetch("/Cities/sync-api", {
        method: "POST",
        body: {},
      });
      setMessage(
        `Removed ${result.removedUnused || 0} unused manual cities. Added ${result.inserted || 0} from API.`
      );
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(err.message || "City sync failed.");
      setMessage("");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="admin-cities-wrap">
      <div className="admin-cities-sync">
        <button type="button" onClick={syncFromApi} disabled={syncing}>
          {syncing ? "Syncing..." : "Load Europe cities from API"}
        </button>
        {message ? <p>{message}</p> : null}
        {error ? <p className="admin-manage-error">{error}</p> : null}
      </div>
      <AdminCrudPage
        key={reloadKey}
        className="admin-cities-page"
        title="Cities"
        hint="Cities are loaded from the countriesnow API. Unused manual cities are removed first. Cities used on listings are kept."
        endpoint="/Cities"
        fields={[
          { key: "name", label: "City" },
          {
            key: "countryId",
            label: "Country",
            type: "select",
            optionsEndpoint: "/Country",
          },
        ]}
      />
    </div>
  );
};
