import "./VehicleForSale.css";
import { useEffect, useState } from "react";
import { SearchVehicleItem } from "../components/SearchVehicleItem";
import { ListingAdsSidebar } from "../components/ListingAdsSidebar";
import { VehicleSearch } from "../components/VehicleSearch";
import { getClerkToken } from "../services/clerkToken";
import { useRankedSearchVehicles } from "../hooks/useRankedSearchVehicles";
import { API_BASE } from "../config/api";
import { isSaleListing } from "../utils/listingType";

export const VehicleForSale = () => {
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [searchActive, setSearchActive] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState(null);
  const rankedVehicles = useRankedSearchVehicles(filteredVehicles);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    try {
      setLoading(true);
      setError("");

      const currentToken = await getClerkToken();
      setToken(currentToken);

      const response = await fetch(`${API_BASE}/Vehicles`);
      if (!response.ok) {
        throw new Error("Could not load vehicles.");
      }

      const data = await response.json();
      const saleVehicles = data.filter(isSaleListing);

      setVehicles(saleVehicles);
      setFilteredVehicles(saleVehicles);
    } catch (err) {
      console.error("VEHICLES ERROR:", err);
      setError(err.message || "Something went wrong while loading vehicles.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchResults(data) {
    if (data === null) {
      setSearchActive(false);
      setFilteredVehicles(vehicles);
      return;
    }
    setSearchActive(true);
    setFilteredVehicles(data);
  }

  return (
    <div className="vehicle-for-sale-page">
      <div className="vehicle-page-header">
        <div>
          <span className="vehicle-page-label">AUTOMARKET</span>
          <h1>Vehicles For Sale</h1>
          <p>Find your next vehicle</p>
        </div>
      </div>

      <div className="listing-page-search">
        <VehicleSearch
          onSearchResults={handleSearchResults}
          listingFilter="sale"
          activeLink="sale"
        />
      </div>

      {error ? (
        <div className="vehicle-page-message">
          <p>{error}</p>
        </div>
      ) : (
        <div className="vehicles-content-layout">
        <div className="vehicles-list-section">
          {loading ? (
            <div className="no-vehicles">
              <h2>Loading vehicles...</h2>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="no-vehicles">
              <div className="no-vehicles-icon">🚗</div>
              <h2>No vehicles found</h2>
              <p>
                {searchActive
                  ? "Try changing your filters or reset search."
                  : "Try changing your filters."}
              </p>
            </div>
          ) : (
            <div className="vehicle-grid">
              {rankedVehicles.map((vehicle) => (
                <SearchVehicleItem
                  key={vehicle.id}
                  vehicle={vehicle}
                  token={token}
                />
              ))}
            </div>
          )}
        </div>

        <ListingAdsSidebar />
      </div>
      )}
    </div>
  );
};
