import "./VehicleForRent.css";
import { useEffect, useState } from "react";
import { SearchVehicleItem } from "../components/SearchVehicleItem";
import { ListingAdsSidebar } from "../components/ListingAdsSidebar";
import { VehicleSearch } from "../components/VehicleSearch";
import { getClerkToken } from "../services/clerkToken";
import { useRankedSearchVehicles } from "../hooks/useRankedSearchVehicles";
import { API_BASE } from "../config/api";
import { isRentListing } from "../utils/listingType";

export const VehicleForRent = () => {
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
      const rentVehicles = data.filter(isRentListing);

      setVehicles(rentVehicles);
      setFilteredVehicles(rentVehicles);
    } catch (err) {
      console.error("RENT VEHICLES ERROR:", err);
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
    <div className="vehicle-for-rent-page">
      <div className="vehicle-page-header">
        <div>
          <span className="vehicle-page-label">AUTOMARKET</span>
          <h1>Vehicles For Rent</h1>
          <p>Find the perfect vehicle for your trip</p>
        </div>
      </div>

      <div className="listing-page-search">
        <VehicleSearch
          onSearchResults={handleSearchResults}
          listingFilter="rent"
          activeLink="rent"
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
