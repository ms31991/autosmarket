
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { API_BASE } from "../config/api";
import {
  filterByListingType,
  listingTypeIdFromCatalog,
} from "../utils/listingType";
import "./VehicleSearch.css";

export const VehicleSearch = ({
  onSearchResults,
  listingFilter,
  activeLink = "home",
}) => {
  const { t } = useLanguage();
  // =====================================================
  // DATABASE DATA
  // =====================================================

  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [bodyTypes, setBodyTypes] = useState([]);
  const [fuelTypes, setFuelTypes] = useState([]);
  const [transmissionTypes, setTransmissionTypes] = useState([]);
  const [driveTypes, setDriveTypes] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [colors, setColors] = useState([]);
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [lockedListingTypeId, setLockedListingTypeId] = useState("");

  // =====================================================
  // SEARCH
  // =====================================================

  const [search, setSearch] = useState("");

  // =====================================================
  // FILTERS
  // =====================================================

  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bodyTypeId, setBodyTypeId] = useState("");
  const [fuelTypeId, setFuelTypeId] = useState("");
  const [transmissionId, setTransmissionId] = useState("");
  const [driveTypeId, setDriveTypeId] = useState("");
  const [conditionId, setConditionId] = useState("");
  const [colorId, setColorId] = useState("");
  const [countryId, setCountryId] = useState("");
  const [cityId, setCityId] = useState("");

  const [price, setPrice] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [power, setPower] = useState("");
  const [engine, setEngine] = useState("");

  const [loading, setLoading] = useState(false);

  // =====================================================
  // MOBILE ADVANCED SEARCH
  // =====================================================

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!listingFilter) {
      setLockedListingTypeId("");
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE}/ListingTypes`)
      .then((response) => (response.ok ? response.json() : []))
      .then((rows) => {
        if (cancelled) return;
        const id = listingTypeIdFromCatalog(rows, listingFilter);
        setLockedListingTypeId(id ? String(id) : "");
      })
      .catch(() => {
        if (!cancelled) setLockedListingTypeId("");
      });
    return () => {
      cancelled = true;
    };
  }, [listingFilter]);

  // =====================================================
  // LOAD DATABASE DATA
  // =====================================================

  useEffect(() => {
    const loadSearchData = async () => {
      try {
        const responses = await Promise.all([
          fetch(`${API_BASE}/Brands`),
          fetch(`${API_BASE}/VehicleModels`),
          fetch(`${API_BASE}/VehicleCategories`),
          fetch(`${API_BASE}/BodyTypes`),
          fetch(`${API_BASE}/FuelTypes`),
          fetch(`${API_BASE}/Transmissions`),
          fetch(`${API_BASE}/DriveTypes`),
          fetch(`${API_BASE}/Conditions`),
          fetch(`${API_BASE}/Colors`),
          fetch(`${API_BASE}/Country`),
          fetch(`${API_BASE}/Cities`),
        ]);

        const [
          brandsResponse,
          modelsResponse,
          categoriesResponse,
          bodyTypesResponse,
          fuelResponse,
          transmissionResponse,
          driveResponse,
          conditionsResponse,
          colorsResponse,
          countriesResponse,
          citiesResponse,
        ] = responses;

        if (!brandsResponse.ok)
          throw new Error("Failed to load brands");

        if (!modelsResponse.ok)
          throw new Error("Failed to load models");

        if (!categoriesResponse.ok)
          throw new Error("Failed to load categories");

        if (!bodyTypesResponse.ok)
          throw new Error("Failed to load body types");

        if (!fuelResponse.ok)
          throw new Error("Failed to load fuel types");

        if (!transmissionResponse.ok)
          throw new Error("Failed to load transmission types");

        if (!driveResponse.ok)
          throw new Error("Failed to load drive types");

        if (!conditionsResponse.ok)
          throw new Error("Failed to load conditions");

        if (!colorsResponse.ok)
          throw new Error("Failed to load colors");

        if (!countriesResponse.ok)
          throw new Error("Failed to load countries");

        if (!citiesResponse.ok)
          throw new Error("Failed to load cities");

        setBrands(await brandsResponse.json());
        setModels(await modelsResponse.json());
        setCategories(await categoriesResponse.json());
        setBodyTypes(await bodyTypesResponse.json());
        setFuelTypes(await fuelResponse.json());
        setTransmissionTypes(
          await transmissionResponse.json()
        );
        setDriveTypes(await driveResponse.json());
        setConditions(await conditionsResponse.json());
        setColors(await colorsResponse.json());
        setCountries(await countriesResponse.json());
        setCities(await citiesResponse.json());
      } catch (error) {
        console.error(
          "Error loading search data:",
          error
        );
      }
    };

    loadSearchData();
  }, []);

  // =====================================================
  // FILTER MODELS BY BRAND
  // =====================================================

  const filteredModels = brandId
    ? models.filter(
        (model) =>
          Number(model.brandId) === Number(brandId)
      )
    : models;

  // =====================================================
  // FILTER CITIES BY COUNTRY
  // =====================================================

  const filteredCities = countryId
    ? cities.filter(
        (city) =>
          Number(city.countryId) === Number(countryId)
      )
    : cities;

  // =====================================================
  // BRAND CHANGE
  // =====================================================

  const handleBrandChange = (e) => {
    const value = e.target.value;

    setBrandId(value);

    // Reset model when brand changes
    setModelId("");
  };

  // =====================================================
  // COUNTRY CHANGE
  // =====================================================

  const handleCountryChange = (e) => {
    const value = e.target.value;

    setCountryId(value);

    // Reset city when country changes
    setCityId("");
  };

  // =====================================================
  // ADD RANGE
  // =====================================================

  const addRange = (params, value, ranges) => {
    const range = ranges[value];

    if (!range) {
      return;
    }

    if (
      range.min !== undefined &&
      range.min !== null
    ) {
      params.append(
        range.minKey,
        String(range.min)
      );
    }

    if (
      range.max !== undefined &&
      range.max !== null
    ) {
      params.append(
        range.maxKey,
        String(range.max)
      );
    }
  };

  // =====================================================
  // BUILD SEARCH PARAMETERS
  // =====================================================

  const buildSearchParams = () => {
    const params = new URLSearchParams();

    // ===================================================
    // SEARCH TEXT
    // ===================================================

    if (search.trim()) {
      params.append(
        "Search",
        search.trim()
      );
    }

    params.append("pageSize", "100");

    if (lockedListingTypeId) {
      params.append("ListingTypeId", lockedListingTypeId);
    }

    // ===================================================
    // ID FILTERS
    // ===================================================

    if (brandId) {
      params.append("BrandId", brandId);
    }

    if (modelId) {
      params.append("ModelId", modelId);
    }

    if (categoryId) {
      params.append("CategoryId", categoryId);
    }

    if (bodyTypeId) {
      params.append("BodyTypeId", bodyTypeId);
    }

    if (fuelTypeId) {
      params.append("FuelTypeId", fuelTypeId);
    }

    if (transmissionId) {
      params.append(
        "TransmissionId",
        transmissionId
      );
    }

    if (driveTypeId) {
      params.append(
        "DriveTypeId",
        driveTypeId
      );
    }

    if (conditionId) {
      params.append(
        "ConditionId",
        conditionId
      );
    }

    if (colorId) {
      params.append(
        "ColorId",
        colorId
      );
    }

    if (countryId) {
      params.append(
        "CountryId",
        countryId
      );
    }

    if (cityId) {
      params.append(
        "CityId",
        cityId
      );
    }

    // ===================================================
    // PRICE
    // ===================================================

    addRange(params, price, {
      "0-10000": {
        minKey: "MinPrice",
        maxKey: "MaxPrice",
        min: 0,
        max: 10000,
      },

      "10000-20000": {
        minKey: "MinPrice",
        maxKey: "MaxPrice",
        min: 10000,
        max: 20000,
      },

      "20000-40000": {
        minKey: "MinPrice",
        maxKey: "MaxPrice",
        min: 20000,
        max: 40000,
      },

      "40000-60000": {
        minKey: "MinPrice",
        maxKey: "MaxPrice",
        min: 40000,
        max: 60000,
      },

      "60000+": {
        minKey: "MinPrice",
        min: 60000,
      },
    });

    // ===================================================
    // YEAR
    // ===================================================

    addRange(params, year, {
      "2025+": {
        minKey: "MinYear",
        min: 2025,
      },

      "2020-2024": {
        minKey: "MinYear",
        maxKey: "MaxYear",
        min: 2020,
        max: 2024,
      },

      "2015-2019": {
        minKey: "MinYear",
        maxKey: "MaxYear",
        min: 2015,
        max: 2019,
      },

      "2010-2014": {
        minKey: "MinYear",
        maxKey: "MaxYear",
        min: 2010,
        max: 2014,
      },

      "2000-2009": {
        minKey: "MinYear",
        maxKey: "MaxYear",
        min: 2000,
        max: 2009,
      },

      "1990-1999": {
        minKey: "MinYear",
        maxKey: "MaxYear",
        min: 1990,
        max: 1999,
      },
    });

    // ===================================================
    // MILEAGE
    // ===================================================

    addRange(params, mileage, {
      "0-50000": {
        minKey: "MinMileage",
        maxKey: "MaxMileage",
        min: 0,
        max: 50000,
      },

      "50000-100000": {
        minKey: "MinMileage",
        maxKey: "MaxMileage",
        min: 50000,
        max: 100000,
      },

      "100000-150000": {
        minKey: "MinMileage",
        maxKey: "MaxMileage",
        min: 100000,
        max: 150000,
      },

      "150000+": {
        minKey: "MinMileage",
        min: 150000,
      },
    });

    // ===================================================
    // POWER
    // ===================================================

    addRange(params, power, {
      "0-100": {
        minKey: "MinPowerHP",
        maxKey: "MaxPowerHP",
        min: 0,
        max: 100,
      },

      "100-150": {
        minKey: "MinPowerHP",
        maxKey: "MaxPowerHP",
        min: 100,
        max: 150,
      },

      "150-200": {
        minKey: "MinPowerHP",
        maxKey: "MaxPowerHP",
        min: 150,
        max: 200,
      },

      "200-300": {
        minKey: "MinPowerHP",
        maxKey: "MaxPowerHP",
        min: 200,
        max: 300,
      },

      "300+": {
        minKey: "MinPowerHP",
        min: 300,
      },

      "500+": {
        minKey: "MinPowerHP",
        min: 500,
      },
    });

    // ===================================================
    // ENGINE
    // ===================================================

    addRange(params, engine, {
      "0-1.5": {
        minKey: "MinEngine",
        maxKey: "MaxEngine",
        min: 0,
        max: 1.5,
      },

      "1.5-2.0": {
        minKey: "MinEngine",
        maxKey: "MaxEngine",
        min: 1.5,
        max: 2.0,
      },

      "2.0-3.0": {
        minKey: "MinEngine",
        maxKey: "MaxEngine",
        min: 2.0,
        max: 3.0,
      },

      "3.0-4.0": {
        minKey: "MinEngine",
        maxKey: "MaxEngine",
        min: 3.0,
        max: 4.0,
      },

      "4.0+": {
        minKey: "MinEngine",
        min: 4.0,
      },
    });

    // ===================================================
    // PAGINATION
    // ===================================================

    params.append("Page", "1");
    params.append("PageSize", "20");

    return params;
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = async () => {
    setLoading(true);

    try {
      const params = buildSearchParams();

      const url =
        `${API_BASE}/Vehicles/search?` +
        params.toString();

      console.log(
        "VEHICLE SEARCH URL:",
        url
      );

      const response = await fetch(url);

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          "SEARCH API ERROR:",
          response.status,
          errorText
        );

        throw new Error(
          `Search request failed: ${response.status}`
        );
      }

      const result =
        await response.json();

      console.log(
        "VEHICLE SEARCH RESULT:",
        result
      );

      // =================================================
      // HANDLE DIFFERENT API RESPONSE FORMATS
      // =================================================

      let vehicles = [];

      if (Array.isArray(result)) {
        vehicles = result;
      } else if (
        Array.isArray(result.items)
      ) {
        vehicles = result.items;
      } else if (
        Array.isArray(result.data)
      ) {
        vehicles = result.data;
      } else if (
        Array.isArray(result.results)
      ) {
        vehicles = result.results;
      }

      vehicles = filterByListingType(vehicles, listingFilter);

      // =================================================
      // SEND RESULTS TO HOME
      // =================================================

      if (onSearchResults) {
        onSearchResults(vehicles);
      }

      // Close advanced filters on mobile
      setShowAdvanced(false);
    } catch (error) {
      console.error(
        "Vehicle search error:",
        error
      );

      if (onSearchResults) {
        onSearchResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RESET FILTERS
  // =====================================================

  const handleReset = () => {
    setSearch("");

    setBrandId("");
    setModelId("");
    setCategoryId("");
    setBodyTypeId("");
    setFuelTypeId("");
    setTransmissionId("");
    setDriveTypeId("");
    setConditionId("");
    setColorId("");
    setCountryId("");
    setCityId("");

    setPrice("");
    setYear("");
    setMileage("");
    setPower("");
    setEngine("");

    // Close advanced filters
    setShowAdvanced(false);

    // IMPORTANT:
    // null means:
    // "there is no active search"
    //
    // Home can use this to show its
    // normal homepage elements again.
    if (onSearchResults) {
      onSearchResults(null);
    }
  };

  // =====================================================
  // SELECT HELPER
  // =====================================================

  const SelectFilter = ({
    label,
    value,
    onChange,
    children,
  }) => {
    const id = `filter-${label.replace(/\s+/g, "-").toLowerCase()}`;

    return (
    <div className="filter-item">
      <label htmlFor={id}>{label}</label>

      <select
        id={id}
        value={value}
        onChange={onChange}
      >
        {children}
      </select>
    </div>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="vehicle-search-container">

      {/* =================================================
          SEARCH LINKS
      ================================================= */}

      <div className="vehicle-search-links">

        <Link
          to="/"
          className={
            activeLink === "home"
              ? "vehicle-search-link active"
              : "vehicle-search-link"
          }
        >
          {t("navHome")}
        </Link>

        <Link
          to="/vehicles-for-sale"
          className={
            activeLink === "sale"
              ? "vehicle-search-link active"
              : "vehicle-search-link"
          }
        >
          {t("buy")}
        </Link>

        <Link
          to="/vehicles-for-rent"
          className={
            activeLink === "rent"
              ? "vehicle-search-link active"
              : "vehicle-search-link"
          }
        >
          {t("rent")}
        </Link>

      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      <section className="vehicle-search">

        {/* =================================================
            MAIN SEARCH
        ================================================= */}

        <div className="search-main">

          <div className="search-input-wrapper">

            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />

              <path d="m20 20-3.5-3.5" />
            </svg>

            <input
              style={{paddingLeft:'15px'}}
              id="vehicle-search-input"
              type="search"
              aria-label={t("searchVehicles")}
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder={t("searchAnything")}
            />

          </div>

          <span
            className="search-divider"
            aria-hidden="true"
          />

          {/* =================================================
              FILTER BUTTON
          ================================================= */}

          <button
            type="button"
            className={
              showAdvanced
                ? "filter-toggle open"
                : "filter-toggle"
            }
            onClick={() =>
              setShowAdvanced(
                !showAdvanced
              )
            }
            aria-label={t("openFilters")}
            aria-expanded={showAdvanced}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M4 7h16" />

              <circle
                cx="8"
                cy="7"
                r="2.1"
                fill="currentColor"
                stroke="none"
              />

              <path d="M4 12h16" />

              <circle
                cx="15"
                cy="12"
                r="2.1"
                fill="currentColor"
                stroke="none"
              />

              <path d="M4 17h16" />

              <circle
                cx="10"
                cy="17"
                r="2.1"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </button>

          {/* =================================================
              SEARCH BUTTON
          ================================================= */}

          <button
            type="button"
            className="search-button"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading
              ? t("searching")
              : t("search")}
          </button>

        </div>

        {/* =================================================
            ADVANCED SEARCH
        ================================================= */}

        <div
          className={
            showAdvanced
              ? "advanced-search filters-open"
              : "advanced-search"
          }
        >

          {/* BRAND */}

          <SelectFilter
            label={t("brand")}
            value={brandId}
            onChange={handleBrandChange}
          >
            <option value="">
              {t("allBrands")}
            </option>

            {brands.map((brand) => (
              <option
                key={brand.id}
                value={brand.id}
              >
                {brand.name}
              </option>
            ))}
          </SelectFilter>

          {/* MODEL */}

          <SelectFilter
            label={t("model")}
            value={modelId}
            onChange={(e) =>
              setModelId(e.target.value)
            }
          >
            <option value="">
              {t("allModels")}
            </option>

            {filteredModels.map((model) => (
              <option
                key={model.id}
                value={model.id}
              >
                {model.name}
              </option>
            ))}
          </SelectFilter>

        

          {/* BODY TYPE */}

          <SelectFilter
            label={t("bodyType")}
            value={bodyTypeId}
            onChange={(e) =>
              setBodyTypeId(e.target.value)
            }
          >
            <option value="">
              All Body Types
            </option>

            {bodyTypes.map((bodyType) => (
              <option
                key={bodyType.id}
                value={bodyType.id}
              >
                {bodyType.name}
              </option>
            ))}
          </SelectFilter>

          {/* PRICE */}

          <SelectFilter
            label={t("price")}
            value={price}
            onChange={(e) =>
              setPrice(e.target.value)
            }
          >
            <option value="">
              Any Price
            </option>

            <option value="0-10000">
              €0 - €10,000
            </option>

            <option value="10000-20000">
              €10,000 - €20,000
            </option>

            <option value="20000-40000">
              €20,000 - €40,000
            </option>

            <option value="40000-60000">
              €40,000 - €60,000
            </option>

            <option value="60000+">
              €60,000+
            </option>
          </SelectFilter>

          {/* YEAR */}

          <SelectFilter
            label={t("year")}
            value={year}
            onChange={(e) =>
              setYear(e.target.value)
            }
          >
            <option value="">
              Any Year
            </option>

            <option value="2025+">
              2025+
            </option>

            <option value="2020-2024">
              2020 - 2024
            </option>

            <option value="2015-2019">
              2015 - 2019
            </option>

            <option value="2010-2014">
              2010 - 2014
            </option>

            <option value="2000-2009">
              2000 - 2009
            </option>

            <option value="1990-1999">
              1990 - 1999
            </option>
          </SelectFilter>

          {/* MILEAGE */}

          <SelectFilter
            label={t("mileage")}
            value={mileage}
            onChange={(e) =>
              setMileage(e.target.value)
            }
          >
            <option value="">
              Any Mileage
            </option>

            <option value="0-50000">
              Under 50,000 km
            </option>

            <option value="50000-100000">
              50,000 - 100,000 km
            </option>

            <option value="100000-150000">
              100,000 - 150,000 km
            </option>

            <option value="150000+">
              150,000+ km
            </option>
          </SelectFilter>

          {/* FUEL */}

          <SelectFilter
            label={t("fuel")}
            value={fuelTypeId}
            onChange={(e) =>
              setFuelTypeId(e.target.value)
            }
          >
            <option value="">
              All Fuels
            </option>

            {fuelTypes.map((fuel) => (
              <option
                key={fuel.id}
                value={fuel.id}
              >
                {fuel.name}
              </option>
            ))}
          </SelectFilter>

          {/* TRANSMISSION */}

          <SelectFilter
            label={t("transmission")}
            value={transmissionId}
            onChange={(e) =>
              setTransmissionId(
                e.target.value
              )
            }
          >
            <option value="">
              All Transmissions
            </option>

            {transmissionTypes.map(
              (transmission) => (
                <option
                  key={transmission.id}
                  value={transmission.id}
                >
                  {transmission.name}
                </option>
              )
            )}
          </SelectFilter>

          {/* DRIVE TYPE */}

          <SelectFilter
            label={t("driveType")}
            value={driveTypeId}
            onChange={(e) =>
              setDriveTypeId(
                e.target.value
              )
            }
          >
            <option value="">
              All Drive Types
            </option>

            {driveTypes.map((drive) => (
              <option
                key={drive.id}
                value={drive.id}
              >
                {drive.name}
              </option>
            ))}
          </SelectFilter>

          {/* CONDITION */}

          <SelectFilter
            label={t("condition")}
            value={conditionId}
            onChange={(e) =>
              setConditionId(
                e.target.value
              )
            }
          >
            <option value="">
              All Conditions
            </option>

            {conditions.map((condition) => (
              <option
                key={condition.id}
                value={condition.id}
              >
                {condition.name}
              </option>
            ))}
          </SelectFilter>

          {/* COLOR */}

          <SelectFilter
            label={t("color")}
            value={colorId}
            onChange={(e) =>
              setColorId(
                e.target.value
              )
            }
          >
            <option value="">
              All Colors
            </option>

            {colors.map((color) => (
              <option
                key={color.id}
                value={color.id}
              >
                {color.name}
              </option>
            ))}
          </SelectFilter>

          {/* COUNTRY */}

          <SelectFilter
            label={t("country")}
            value={countryId}
            onChange={handleCountryChange}
          >
            <option value="">
              All Countries
            </option>

            {countries.map((country) => (
              <option
                key={country.id}
                value={country.id}
              >
                {country.name}
              </option>
            ))}
          </SelectFilter>

          {/* CITY */}

          <SelectFilter
            label={t("city")}
            value={cityId}
            onChange={(e) =>
              setCityId(e.target.value)
            }
          >
            <option value="">
              All Cities
            </option>

            {filteredCities.map((city) => (
              <option
                key={city.id}
                value={city.id}
              >
                {city.name}
              </option>
            ))}
          </SelectFilter>

          {/* ENGINE */}

          <SelectFilter
            label={t("engine")}
            value={engine}
            onChange={(e) =>
              setEngine(e.target.value)
            }
          >
            <option value="">
              Any Engine
            </option>

            <option value="0-1.5">
              Up to 1.5L
            </option>

            <option value="1.5-2.0">
              1.5L - 2.0L
            </option>

            <option value="2.0-3.0">
              2.0L - 3.0L
            </option>

            <option value="3.0-4.0">
              3.0L - 4.0L
            </option>

            <option value="4.0+">
              4.0L+
            </option>
          </SelectFilter>

          {/* POWER */}

          <SelectFilter
            label={t("power")}
            value={power}
            onChange={(e) =>
              setPower(e.target.value)
            }
          >
            <option value="">
              Any Power
            </option>

            <option value="0-100">
              0 - 100 HP
            </option>

            <option value="100-150">
              100 - 150 HP
            </option>

            <option value="150-200">
              150 - 200 HP
            </option>

            <option value="200-300">
              200 - 300 HP
            </option>

            <option value="300+">
              300+ HP
            </option>

            <option value="500+">
              500+ HP
            </option>
          </SelectFilter>

          {/* RESET */}

          <button
            type="button"
            className="reset-button"
            onClick={handleReset}
          >
            Reset
          </button>

        </div>
      </section>
    </div>
  );
};
