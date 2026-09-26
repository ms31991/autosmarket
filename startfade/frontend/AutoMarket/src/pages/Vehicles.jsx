import "./Vehicles.css";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchVehicleItem } from "../components/SearchVehicleItem";
import { ListingAdsSidebar } from "../components/ListingAdsSidebar";
import { AdSenseBanner } from "../components/AdSenseBanner";
import { getClerkToken } from "../services/clerkToken";
import { useLanguage } from "../i18n/LanguageContext";
import { useRankedSearchVehicles } from "../hooks/useRankedSearchVehicles";
import { API_BASE } from "../config/api";
import { ADSENSE_SLOT_HOME } from "../config/site";

export const Vehicles = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState(null);

  const [showFilters, setShowFilters] = useState(false);
  const rankedVehicles = useRankedSearchVehicles(filteredVehicles);

  // FILTERS
  const [search, setSearch] = useState(
    () => searchParams.get("search") || ""
  );
  const [brand, setBrand] = useState("");
  const [fuel, setFuel] = useState("");
  const [transmission, setTransmission] = useState("");
  const [year, setYear] = useState("");
  const [sort, setSort] = useState("");

  // =====================================================
  // LOAD ALL VEHICLES
  // =====================================================

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  async function fetchVehicles() {
    try {
      setLoading(true);
      setError("");

      const currentToken = await getClerkToken();

      setToken(currentToken);

      const response = await fetch(`${API_BASE}/Vehicles`);

      if (!response.ok) {
        throw new Error(t("vehiclesError"));
      }

      const data = await response.json();

      console.log("ALL VEHICLES:", data);

      // ALL VEHICLES
      // Sale + Rent
      setVehicles(data);
      setFilteredVehicles(data);

    } catch (err) {
      console.error("VEHICLES ERROR:", err);

      setError(
        err.message ||
          t("vehiclesError")
      );

    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // FILTER VEHICLES
  // =====================================================

  useEffect(() => {
    let result = [...vehicles];

    // ===================================================
    // SEARCH
    // ===================================================

    if (search.trim()) {
      const searchValue = search.toLowerCase();

      result = result.filter((vehicle) => {
        const brandName =
          vehicle.brand?.name ||
          vehicle.brandName ||
          vehicle.make ||
          "";

        const modelName =
          vehicle.model?.name ||
          vehicle.modelName ||
          vehicle.model ||
          "";

        const bodyName =
          vehicle.bodyType?.name ||
          vehicle.bodyTypeName ||
          vehicle.bodyType ||
          "";

        const fuelName =
          vehicle.fuelType?.name ||
          vehicle.fuelTypeName ||
          vehicle.fuelType ||
          vehicle.fuel ||
          "";

        const categoryName =
          vehicle.category?.name ||
          vehicle.categoryName ||
          vehicle.category ||
          "";

        const cityName =
          vehicle.city?.name ||
          vehicle.cityName ||
          vehicle.city ||
          "";

        const countryName =
          vehicle.country?.name ||
          vehicle.countryName ||
          vehicle.country ||
          "";

        return (
          String(brandName).toLowerCase().includes(searchValue) ||
          String(modelName).toLowerCase().includes(searchValue) ||
          String(bodyName).toLowerCase().includes(searchValue) ||
          String(fuelName).toLowerCase().includes(searchValue) ||
          String(categoryName).toLowerCase().includes(searchValue) ||
          String(cityName).toLowerCase().includes(searchValue) ||
          String(countryName).toLowerCase().includes(searchValue)
        );
      });
    }

    // ===================================================
    // BRAND
    // ===================================================

    if (brand) {
      result = result.filter((vehicle) => {
        const vehicleBrand =
          vehicle.brand?.name ||
          vehicle.brandName ||
          vehicle.make ||
          "";

        return (
          String(vehicleBrand).toLowerCase() ===
          brand.toLowerCase()
        );
      });
    }

    // ===================================================
    // FUEL
    // ===================================================

    if (fuel) {
      result = result.filter((vehicle) => {
        const vehicleFuel =
          vehicle.fuelType?.name ||
          vehicle.fuelTypeName ||
          vehicle.fuelType ||
          vehicle.fuel ||
          "";

        return (
          String(vehicleFuel).toLowerCase() ===
          fuel.toLowerCase()
        );
      });
    }

    // ===================================================
    // TRANSMISSION
    // ===================================================

    if (transmission) {
      result = result.filter((vehicle) => {
        const vehicleTransmission =
          vehicle.transmission?.name ||
          vehicle.transmissionName ||
          vehicle.transmission ||
          "";

        return (
          String(vehicleTransmission).toLowerCase() ===
          transmission.toLowerCase()
        );
      });
    }

    // ===================================================
    // YEAR
    // ===================================================

    if (year) {
      result = result.filter(
        (vehicle) =>
          Number(vehicle.year) === Number(year)
      );
    }

    // ===================================================
    // SORT
    // ===================================================

    if (sort === "newest") {
      result.sort(
        (a, b) =>
          Number(b.year || 0) -
          Number(a.year || 0)
      );
    }

    if (sort === "oldest") {
      result.sort(
        (a, b) =>
          Number(a.year || 0) -
          Number(b.year || 0)
      );
    }

    if (sort === "price-low") {
      result.sort(
        (a, b) =>
          Number(a.price || 0) -
          Number(b.price || 0)
      );
    }

    if (sort === "price-high") {
      result.sort(
        (a, b) =>
          Number(b.price || 0) -
          Number(a.price || 0)
      );
    }

    setFilteredVehicles(result);

  }, [
    vehicles,
    search,
    brand,
    fuel,
    transmission,
    year,
    sort,
  ]);

  // =====================================================
  // CLEAR FILTERS
  // =====================================================

  function clearFilters() {
    setSearch("");
    setBrand("");
    setFuel("");
    setTransmission("");
    setYear("");
    setSort("");
  }

  // =====================================================
  // FILTER OPTIONS
  // =====================================================

  const brands = [
    ...new Set(
      vehicles
        .map(
          (vehicle) =>
            vehicle.brand?.name ||
            vehicle.brandName ||
            vehicle.make
        )
        .filter(Boolean)
    ),
  ].sort();

  const fuels = [
    ...new Set(
      vehicles
        .map(
          (vehicle) =>
            vehicle.fuelType?.name ||
            vehicle.fuelTypeName ||
            vehicle.fuelType ||
            vehicle.fuel
        )
        .filter(Boolean)
    ),
  ].sort();

  const transmissions = [
    ...new Set(
      vehicles
        .map(
          (vehicle) =>
            vehicle.transmission?.name ||
            vehicle.transmissionName ||
            vehicle.transmission
        )
        .filter(Boolean)
    ),
  ].sort();

  const years = [
    ...new Set(
      vehicles
        .map((vehicle) => vehicle.year)
        .filter(Boolean)
    ),
  ].sort((a, b) => b - a);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="vehicles-page">

        <div className="vehicle-page-message">
          <h1>{t("allVehicles")}</h1>

          <p>
            {t("loadingVehicles")}
          </p>
        </div>

      </div>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <div className="vehicles-page">

        <div className="vehicle-page-message">
          <h1>{t("allVehicles")}</h1>

          <p>{error}</p>
        </div>

      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="vehicles-page">

      {/* =========================================
          PAGE HEADER
      ========================================= */}

      <div className="vehicle-page-header">

        <div>

          <span className="vehicle-page-label">
            AUTOTRADE
          </span>

          <h1>
            {t("allVehicles")}
          </h1>

          <p>
            {t("vehiclesAllDesc")}
          </p>

        </div>

      </div>


      {/* =========================================
          MOBILE FILTER BUTTON
      ========================================= */}

      <button
        className="mobile-filter-button"
        onClick={() =>
          setShowFilters(!showFilters)
        }
      >

        <span>☰</span>

        {showFilters
          ? "Hide Filters"
          : "Filters"}

      </button>


      {/* =========================================
          FILTER BAR
      ========================================= */}

      <div
        className={`vehicle-filter ${
          showFilters ? "filters-open" : ""
        }`}
      >

        {/* SEARCH */}

        <div className="filter-search">

          <span className="search-icon">
            🔍
          </span>

          <input
            type="text"
            placeholder="Search brand or model..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>


        {/* BRAND */}

        <select
          value={brand}
          onChange={(e) =>
            setBrand(e.target.value)
          }
        >

          <option value="">
            All Brands
          </option>

          {brands.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}

        </select>


        {/* FUEL */}

        <select
          value={fuel}
          onChange={(e) =>
            setFuel(e.target.value)
          }
        >

          <option value="">
            All Fuel Types
          </option>

          {fuels.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}

        </select>


        {/* TRANSMISSION */}

        <select
          value={transmission}
          onChange={(e) =>
            setTransmission(e.target.value)
          }
        >

          <option value="">
            Transmission
          </option>

          {transmissions.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}

        </select>


        {/* YEAR */}

        <select
          value={year}
          onChange={(e) =>
            setYear(e.target.value)
          }
        >

          <option value="">
            All Years
          </option>

          {years.map((item) => (
            <option
              key={item}
              value={item}
            >
              {item}
            </option>
          ))}

        </select>


        {/* SORT */}

        <select
          value={sort}
          onChange={(e) =>
            setSort(e.target.value)
          }
        >

          <option value="">
            Sort By
          </option>

          <option value="newest">
            Newest Year
          </option>

          <option value="oldest">
            Oldest Year
          </option>

          <option value="price-low">
            Price: Low to High
          </option>

          <option value="price-high">
            Price: High to Low
          </option>

        </select>


        {/* CLEAR */}

        <button
          className="clear-filters"
          onClick={clearFilters}
        >
          Clear
        </button>

      </div>


      {/* =========================================
          VEHICLES + ADS
      ========================================= */}

      <AdSenseBanner slot={ADSENSE_SLOT_HOME} className="adsense-banner--listing" />

      <div className="vehicles-content-layout">

        {/* LEFT SIDE */}

        <div className="vehicles-list-section">

          {filteredVehicles.length === 0 ? (

            <div className="no-vehicles">

              <div className="no-vehicles-icon">
                🚗
              </div>

              <h2>
                No vehicles found
              </h2>

              <p>
                Try changing your filters.
              </p>

              <button
                onClick={clearFilters}
              >
                Clear Filters
              </button>

            </div>

          ) : (

            <div className="vehicle-grid">

              {rankedVehicles.map(
                (vehicle) => (

                  <SearchVehicleItem
                    key={vehicle.id}
                    vehicle={vehicle}
                    token={token}
                  />

                )
              )}

            </div>

          )}

        </div>


        <ListingAdsSidebar />

      </div>
          
    </div>
  );
};
