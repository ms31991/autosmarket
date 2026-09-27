import "./VehicleForSale.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SearchVehicleItem } from "../components/SearchVehicleItem";
import { ListingAdsSidebar } from "../components/ListingAdsSidebar";
import { VehicleSearch } from "../components/VehicleSearch";
import { getClerkToken } from "../services/clerkToken";
import { useRankedSearchVehicles } from "../hooks/useRankedSearchVehicles";
import { API_BASE } from "../config/api";
import { isSaleListing } from "../utils/listingType";
import { useLanguage } from "../i18n/LanguageContext";
import { SeoHead } from "../seo/SeoHead";
import { listingCollectionSeo, useListingScope, scopeVehicles } from "../seo/listingSeo";
import { ListingRelated, SeoBreadcrumbs } from "../seo/SeoBreadcrumbs";

export const VehicleForSale = () => {
  const { brandSlug, citySlug } = useParams();
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [searchActive, setSearchActive] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState(null);
  const scoped = useListingScope(vehicles, brandSlug, citySlug);
  const rankedVehicles = useRankedSearchVehicles(filteredVehicles);
  const seo = listingCollectionSeo({
    kind: "sale",
    brandSlug,
    citySlug,
    vehicles: scoped,
    t,
    searchActive,
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (!searchActive) setFilteredVehicles(scoped);
  }, [scoped, searchActive]);

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
      setFilteredVehicles(scopeVehicles(saleVehicles, brandSlug, citySlug));
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
      setFilteredVehicles(scoped);
      return;
    }
    setSearchActive(true);
    setFilteredVehicles(scopeVehicles(data, brandSlug, citySlug));
  }

  return (
    <div className="vehicle-for-sale-page">
      <SeoHead
        title={seo.title}
        description={seo.description}
        canonicalPath={seo.canonicalPath}
        noindex={seo.noindex || loading}
        jsonLd={loading ? null : seo.jsonLd}
      />
      <SeoBreadcrumbs items={seo.breadcrumbs} />
      <div className="vehicle-page-header">
        <div>
          <span className="vehicle-page-label">AUTOMARKET</span>
          <h1>{seo.h1}</h1>
          <p>{seo.lead}</p>
          {(brandSlug || citySlug) && (
            <ListingRelated
              collection={seo.related.collection}
              brand={seo.related.brand}
              brandSlug={seo.related.brandSlug}
              city={seo.related.city}
              citySlug={seo.related.citySlug}
            />
          )}
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
