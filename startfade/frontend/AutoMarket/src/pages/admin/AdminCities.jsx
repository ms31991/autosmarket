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
        `Added ${result.inserted || 0} cities from API. Existing cities were kept.`
      );
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(err.message || "City sync failed.");
      setMessage("");
    } finally {
      setSyncing(false);
    }
  }

  async function seedEurope() {
    try {
      setSyncing(true);
      setError("");
      setMessage("Adding Balkans and major European cities...");
      const result = await catalogFetch("/Cities/seed-europe", {
        method: "POST",
        body: {},
      });
      setMessage(
        `Added ${result.countriesInserted || 0} countries and ${result.citiesInserted || 0} cities (existing kept).`
      );
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(err.message || "City seed failed.");
      setMessage("");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="admin-cities-wrap">
      <div className="admin-cities-sync">
        <button type="button" onClick={seedEurope} disabled={syncing}>
          {syncing ? "Working..." : "Add Balkans + Europe cities"}
        </button>
        <button type="button" onClick={syncFromApi} disabled={syncing}>
          {syncing ? "Syncing..." : "Load extra cities from API"}
        </button>
        {message ? <p>{message}</p> : null}
        {error ? <p className="admin-manage-error">{error}</p> : null}
      </div>
      <AdminCrudPage
        key={reloadKey}
        className="admin-cities-page"
        title="Cities"
        hint="Use Add Balkans + Europe cities to fill missing places without deleting anything. API sync only adds extra names."
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
