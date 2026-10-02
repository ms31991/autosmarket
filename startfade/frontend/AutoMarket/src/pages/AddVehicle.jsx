import "./AddVehicle.css";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getClerkToken } from "../services/clerkToken";
import {
  LegalConsent,
  ListingConsentText,
} from "../components/LegalConsent";
import { useLanguage } from "../i18n/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../config/api";
import { compressImageFile } from "../utils/compressImage";
import { ColorSelect } from "../components/ColorSelect";
import {
  bodyTypeHintFromModel,
  filterBrandSuggestions,
  filterModelSuggestions,
  lookupLabel,
  normalizePlace,
} from "../utils/listingTypeahead";
import {
  clearPendingListing,
  endListingPublish,
  loadPendingListing,
  savePendingListing,
  tryBeginListingPublish,
} from "../utils/pendingListingDraft";

const MAX_VEHICLE_PHOTOS = 10;

export const AddVehicle = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { isLoaded, isSignedIn, dbUser, loadingDbUser } = useAuth();
  const [pendingAuto, setPendingAuto] = useState(false);

  const [listingTypes, setListingTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [bodyTypes, setBodyTypes] = useState([]);
  const [fuelTypes, setFuelTypes] = useState([]);
  const [transmissions, setTransmissions] = useState([]);
  const [driveTypes, setDriveTypes] = useState([]);
  const [colors, setColors] = useState([]);
  const [cities, setCities] = useState([]);
  const [cityQuery, setCityQuery] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [brandQuery, setBrandQuery] = useState("");
  const [brandOpen, setBrandOpen] = useState(false);
  const [modelQuery, setModelQuery] = useState("");
  const [modelOpen, setModelOpen] = useState(false);

  const [formData, setFormData] = useState({
    listingTypeId: "",
    categoryId: "",
    brandId: "",
    modelId: "",
    bodyTypeId: "",
    fuelTypeId: "",
    transmissionId: "",
    driveTypeId: "",
    colorId: "",
    cityId: "",

    price: "",
    year: "",
    mileage: "",

    engine: "",
    powerHP: "",
    powerKW: "",
    cylinders: "",
    seats: "",
  });

  const [images, setImages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [listingConsent, setListingConsent] = useState(false);
  const [missing, setMissing] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      await fetchDropdownData();
      if (cancelled) return;
      try {
        const draft = await loadPendingListing();
        if (cancelled || !draft) return;
        if (draft.formData) setFormData((previous) => ({ ...previous, ...draft.formData }));
        if (draft.cityQuery) setCityQuery(draft.cityQuery);
        if (draft.brandQuery) setBrandQuery(draft.brandQuery);
        if (draft.modelQuery) setModelQuery(draft.modelQuery);
        if (typeof draft.listingConsent === "boolean") {
          setListingConsent(draft.listingConsent);
        }
        if (draft.images?.length) setImages(draft.images);
        if (searchParams.get("publish") === "1") setPendingAuto(true);
      } catch (err) {
        console.error("PENDING LISTING LOAD:", err);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function fetchDropdownData() {
    try {
      setLoading(true);
      setError("");

      const endpoints = [
        { key: "listingTypes", url: `${API_BASE}/ListingTypes` },
        { key: "categories", url: `${API_BASE}/VehicleCategories` },
        { key: "brands", url: `${API_BASE}/Brands` },
        { key: "models", url: `${API_BASE}/VehicleModels` },
        { key: "bodyTypes", url: `${API_BASE}/BodyTypes` },
        { key: "fuelTypes", url: `${API_BASE}/FuelTypes` },
        { key: "transmissions", url: `${API_BASE}/Transmissions` },
        { key: "driveTypes", url: `${API_BASE}/DriveTypes` },
        { key: "colors", url: `${API_BASE}/Colors` },
        { key: "cities", url: `${API_BASE}/Cities` },
      ];

      const responses = await Promise.all(
        endpoints.map((item) => fetch(item.url))
      );

      for (const response of responses) {
        if (!response.ok) {
          throw new Error(
            `Gabim gjatë marrjes së të dhënave. Status: ${response.status}`
          );
        }
      }

      const data = await Promise.all(
        responses.map((response) => response.json())
      );

      setListingTypes(data[0]);
      setCategories(data[1]);
      setBrands(data[2]);
      setModels(data[3]);
      setBodyTypes(data[4]);
      setFuelTypes(data[5]);
      setTransmissions(data[6]);
      setDriveTypes(data[7]);
      setColors(data[8]);
      setCities(data[9]);

      const sale = data[0].find((item) => {
        const name = String(item.name || "").toLowerCase();
        const slug = String(item.slug || "").toLowerCase();
        return slug === "sale" || name === "sale";
      });
      const carCategory = data[1].find((item) => {
        const name = String(item.name || "").toLowerCase();
        const slug = String(item.slug || "").toLowerCase();
        return slug === "car" || name === "car";
      });
      const sedan = data[4].find((item) => {
        const name = String(item.name || "").toLowerCase();
        const slug = String(item.slug || "").toLowerCase();
        return slug === "sedan" || name === "sedan" || name === "limousine";
      });
      const petrol = data[5].find((item) =>
        /petrol|gasoline|benzin/.test(String(item.name || "").toLowerCase())
      );
      const manual = data[6].find((item) =>
        /manual/.test(String(item.name || "").toLowerCase())
      );
      setFormData((previous) => ({
        ...previous,
        listingTypeId: previous.listingTypeId
          ? previous.listingTypeId
          : sale
            ? String(sale.id)
            : previous.listingTypeId,
        categoryId: previous.categoryId
          ? previous.categoryId
          : carCategory
            ? String(carCategory.id)
            : previous.categoryId,
        bodyTypeId: previous.bodyTypeId
          ? previous.bodyTypeId
          : sedan
            ? String(sedan.id)
            : previous.bodyTypeId,
        fuelTypeId: previous.fuelTypeId
          ? previous.fuelTypeId
          : petrol
            ? String(petrol.id)
            : previous.fuelTypeId,
        transmissionId: previous.transmissionId
          ? previous.transmissionId
          : manual
            ? String(manual.id)
            : previous.transmissionId,
      }));

      fillCityFromLocation();
    } catch (err) {
      console.error("DROPDOWN ERROR:", err);
      setError(err.message || "Nuk u morën të dhënat.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    markFilled(name);
    setError("");
    setSuccess("");
  }

  function markFilled(key) {
    setMissing((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : prev));
  }

  function fieldClass(key, extra = "") {
    return ["form-field", extra, missing.includes(key) ? "form-field--invalid" : ""]
      .filter(Boolean)
      .join(" ");
  }

  function revealMissing(keys) {
    setMissing(keys);
    setError(t("fillRedFields"));
    window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-field="${keys[0]}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function collectMissing() {
    const keys = [];
    if (images.length < 1) keys.push("photos");
    if (!brandQuery.trim()) keys.push("brand");
    if (!modelQuery.trim()) keys.push("model");
    if (!formData.year) keys.push("year");
    if (!formData.price) keys.push("price");
    return keys;
  }

  function handleBrandQueryChange(e) {
    const value = e.target.value;
    setBrandQuery(value);
    setBrandOpen(true);
    setFormData((previous) => {
      const current = brands.find(
        (brand) => Number(brand.id) === Number(previous.brandId)
      );
      if (current && current.name === value) return previous;
      return { ...previous, brandId: "", modelId: "" };
    });
    setModelQuery("");
    setModelOpen(false);
    if (value.trim()) markFilled("brand");
    setError("");
    setSuccess("");
  }

  function pickBrand(brand) {
    setFormData((previous) => ({
      ...previous,
      brandId: String(brand.id),
      modelId: "",
    }));
    setBrandQuery(brand.name);
    setBrandOpen(false);
    setModelQuery("");
    setModelOpen(false);
    markFilled("brand");
    setError("");
    setSuccess("");
  }

  function handleModelQueryChange(e) {
    const value = e.target.value;
    setModelQuery(value);
    setModelOpen(true);
    setFormData((previous) => {
      const current = models.find(
        (model) => Number(model.id) === Number(previous.modelId)
      );
      if (current && current.name === value) return previous;
      return { ...previous, modelId: "" };
    });
    if (value.trim()) markFilled("model");
    setError("");
    setSuccess("");
  }

  function pickModel(model) {
    const brand = brands.find(
      (item) => Number(item.id) === Number(model.brandId)
    );
    setFormData((previous) => ({
      ...previous,
      brandId: model.brandId ? String(model.brandId) : previous.brandId,
      modelId: String(model.id),
    }));
    if (brand) setBrandQuery(brand.name);
    setModelQuery(model.name);
    setModelOpen(false);
    applyBodyHint(model.name);
    markFilled("brand");
    markFilled("model");
    setError("");
    setSuccess("");
  }

  function applyBodyHint(modelName) {
    const hint = bodyTypeHintFromModel(modelName);
    if (!hint) return;
    const matched = bodyTypes.find((item) => {
      const name = normalizePlace(item.name);
      return name === hint || name.includes(hint) || hint.includes(name);
    });
    if (!matched) return;
    setFormData((previous) => ({
      ...previous,
      bodyTypeId: String(matched.id),
    }));
  }

  function pickBrandSuggestion(item) {
    if (item.kind === "model" && item.brand && item.model) {
      setFormData((previous) => ({
        ...previous,
        brandId: String(item.brand.id),
        modelId: String(item.model.id),
      }));
      setBrandQuery(item.brand.name);
      setModelQuery(item.model.name);
      setBrandOpen(false);
      setModelOpen(false);
      applyBodyHint(item.model.name);
      markFilled("brand");
      markFilled("model");
      setError("");
      setSuccess("");
      return;
    }
    if (item.brand) pickBrand(item.brand);
  }

  const matchedBrand =
    brands.find((brand) => Number(brand.id) === Number(formData.brandId)) ||
    brands.find(
      (brand) =>
        String(brand.name || "").trim().toLowerCase() ===
        brandQuery.trim().toLowerCase()
    );
  const matchedBrandId = matchedBrand?.id || formData.brandId;

  function cityLabel(city) {
    if (!city) return "";
    return city.countryName ? `${city.name} - ${city.countryName}` : city.name;
  }

  const brandSuggestions = filterBrandSuggestions(brands, models, brandQuery);
  const modelSuggestions = filterModelSuggestions(
    models,
    modelQuery,
    matchedBrandId
  );

  const citySuggestions = (() => {
    const needle = normalizePlace(cityQuery);
    if (needle.length < 1) return [];
    return cities
      .filter((city) =>
        normalizePlace(`${city.name} ${city.countryName || ""}`).includes(
          needle
        )
      )
      .slice(0, 15);
  })();

  function handleCityQueryChange(e) {
    const value = e.target.value;
    setCityQuery(value);
    setCityOpen(true);
    setFormData((previous) => {
      const current = cities.find(
        (city) => Number(city.id) === Number(previous.cityId)
      );
      if (current && cityLabel(current) === value) return previous;
      return { ...previous, cityId: "" };
    });
    setError("");
  }

  function pickCity(city) {
    setFormData((previous) => ({ ...previous, cityId: String(city.id) }));
    setCityQuery(cityLabel(city));
    setCityOpen(false);
    setError("");
  }

  function fillCityFromLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `${API_BASE}/Cities/locate?lat=${latitude}&lon=${longitude}`
          );
          if (!response.ok) return;
          const data = await response.json();
          const located = data.city;
          const cityId = located?.id;
          if (!cityId) return;
          setFormData((previous) =>
            previous.cityId ? previous : { ...previous, cityId: String(cityId) }
          );
          setCityQuery((previous) =>
            previous ? previous : cityLabel(located)
          );
        } catch {
          /* user can pick the city */
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 }
    );
  }

  function getNumberOrNull(value) {
    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return null;
    }

    return Number(value);
  }

  async function handleImageChange(e) {
    const selectedFiles = Array.from(e.target.files || []);

    setError("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const validFiles = [];
    const invalidFiles = [];

    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        invalidFiles.push(`${file.name} - format i palejuar`);
        continue;
      }
      try {
        validFiles.push(await compressImageFile(file));
      } catch {
        invalidFiles.push(`${file.name} - nuk u kompresua nën 5 MB`);
      }
    }

    if (invalidFiles.length > 0) {
      setError(`Disa foto nuk u pranuan: ${invalidFiles.join(", ")}`);
    }

    setImages((previous) => {
      const room = MAX_VEHICLE_PHOTOS - previous.length;
      if (room <= 0) {
        setError(t("photosMax"));
        return previous;
      }
      if (validFiles.length > room) {
        setError(t("photosMax"));
      }
      const next = [...previous, ...validFiles.slice(0, room)];
      if (next.length >= 1) markFilled("photos");
      return next;
    });
    e.target.value = "";
  }

  function removeImage(index) {
    setImages((previous) =>
      previous.filter(
        (_, imageIndex) => imageIndex !== index
      )
    );
  }

  async function discardUnpublishedVehicle(vehicleId) {
    const token = await getClerkToken();
    if (!token || !vehicleId) return;
    try {
      await fetch(`${API_BASE}/Vehicles/${vehicleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("DISCARD VEHICLE:", err);
    }
  }

  async function uploadVehicleImages(vehicleId, token) {
    if (images.length === 0) return 0;

    try {
      setUploadingImages(true);
      const results = await Promise.all(
        images.map(async (file, i) => {
          const uploadData = new FormData();
          uploadData.append("file", file);
          uploadData.append("sortOrder", String(i + 1));

          const response = await fetch(
            `${API_BASE}/VehicleImage/vehicle/${vehicleId}/upload`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: uploadData,
            }
          );

          if (response.ok) return true;

          const responseText = await response.text();
          let message = `Fotoja ${file.name} nuk u uploadua.`;
          try {
            const errorData = JSON.parse(responseText);
            if (errorData.message) message = errorData.message;
          } catch {
            if (responseText) message = responseText;
          }
          console.error("IMAGE UPLOAD ERROR:", message);
          return false;
        })
      );
      return results.filter(Boolean).length;
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();

    setError("");
    setSuccess("");
    setMissing([]);

    const required = collectMissing();
    if (required.length) {
      revealMissing(required);
      return;
    }

    const token = await getClerkToken();

    if (!token) {
      try {
        await savePendingListing({
          formData,
          cityQuery,
          brandQuery,
          modelQuery,
          listingConsent,
          images,
        });
      } catch (err) {
        console.error("PENDING LISTING SAVE:", err);
        setError(t("notLoggedIn"));
        return;
      }
      navigate(
        `/login?redirect=${encodeURIComponent("/add-vehicle?publish=1")}`
      );
      return;
    }

    if (!tryBeginListingPublish()) return;

    try {
      setSaving(true);
      setVerifying(true);

      const vehicleData = {
        listingTypeId: Number(formData.listingTypeId),
        categoryId: Number(formData.categoryId),
        brandId: formData.brandId ? Number(formData.brandId) : null,
        modelId: formData.modelId ? Number(formData.modelId) : null,
        brandName: brandQuery.trim(),
        modelName: modelQuery.trim(),

        bodyTypeId: getNumberOrNull(formData.bodyTypeId),
        fuelTypeId: getNumberOrNull(formData.fuelTypeId),
        transmissionId: getNumberOrNull(
          formData.transmissionId
        ),
        driveTypeId: getNumberOrNull(
          formData.driveTypeId
        ),
        colorId: getNumberOrNull(formData.colorId),
        cityId: getNumberOrNull(formData.cityId),

        price: Number(formData.price),
        year: Number(formData.year),
        mileage: getNumberOrNull(formData.mileage),

        engine: formData.engine.trim() || null,
        engineCC: null,
        powerHP: getNumberOrNull(formData.powerHP),
        powerKW: getNumberOrNull(formData.powerKW),
        cylinders: getNumberOrNull(formData.cylinders),
        seats: getNumberOrNull(formData.seats),
        doors: null,
      };

      const response = await fetch(
        `${API_BASE}/Vehicles`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(vehicleData),
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        let message =
          `Vehicle nuk u krijua. Status: ${response.status}`;
        let serverMissing = [];

        try {
          const errorData =
            JSON.parse(responseText);

          if (errorData.message) {
            message = errorData.message;
          }
          if (Array.isArray(errorData.missing)) {
            serverMissing = errorData.missing;
          }
        } catch {
          if (responseText) {
            message = responseText;
          }
        }

        if (serverMissing.length) {
          setVerifying(false);
          revealMissing(serverMissing);
          return;
        }

        throw new Error(message);
      }

      let vehicleId = null;

      try {
        const result = JSON.parse(responseText);
        vehicleId = result.vehicleId;
      } catch {
        throw new Error(
          "Vehicle u krijua, por nuk u mor ID."
        );
      }

      if (!vehicleId) {
        throw new Error(
          "Vehicle ID mungon në response."
        );
      }

      let uploaded = 0;
      try {
        uploaded = await uploadVehicleImages(vehicleId, token);
      } catch (imageError) {
        console.error("IMAGE UPLOAD ERROR:", imageError);
        await discardUnpublishedVehicle(vehicleId);
        throw new Error(t("photosPublishFail"));
      }

      if (uploaded < 1) {
        await discardUnpublishedVehicle(vehicleId);
        throw new Error(t("photosPublishFail"));
      }

      setSuccess(t("createdOk"));
      await clearPendingListing();
      navigate("/my-vehicles");
    } catch (err) {
      console.error("CREATE VEHICLE ERROR:", err);

      setError(
        err.message ||
          "Ndodhi një gabim gjatë krijimit të veturës."
      );
      setVerifying(false);
    } finally {
      setSaving(false);
      endListingPublish();
    }
  }

  useEffect(() => {
    if (!pendingAuto || loading || saving) return;
    if (!isLoaded || !isSignedIn || loadingDbUser || !dbUser) return;
    setPendingAuto(false);
    handleSubmit();
  }, [
    pendingAuto,
    loading,
    saving,
    isLoaded,
    isSignedIn,
    loadingDbUser,
    dbUser,
  ]);

  if (loading) {
    return (
      <div className="add-vehicle-page">
        <div className="add-vehicle-loading">
          <div className="loading-spinner" />
          <p>{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="add-vehicle-page">
      {verifying ? (
        <div className="publish-verify-overlay" role="status" aria-live="polite">
          <div className="verify-spinner" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} style={{ transform: `rotate(${i * 30}deg)` }} />
            ))}
          </div>
          <p>{t("verifying")}</p>
        </div>
      ) : null}

      <div className="add-vehicle-heading">
        <div>
          <span className="form-eyebrow">
            AUTOTRADE
          </span>

          <h1>{t("addTitle")}</h1>

          <p>
            {t("addSubtitle")}
          </p>
        </div>
      </div>

      {error && (
        <div className="form-message form-error" role="alert">
          <span>!</span>
          {error}
        </div>
      )}

      {success && (
        <div className="form-message form-success">
          <span>✓</span>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        <section className="vehicle-photos-section">
          <div className="vehicle-photos-compact-head">
            <h2>{t("photos")}</h2>
            <p>{t("photosHint")}</p>
          </div>

          <label className={`photo-add-circle-wrap${images.length < 1 ? " photo-add-needed" : ""}${missing.includes("photos") ? " photo-add-invalid" : ""}`} data-field="photos">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageChange}
              disabled={saving || images.length >= MAX_VEHICLE_PHOTOS}
            />
            <span className="photo-add-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="photo-add-count">
              {images.length}/{MAX_VEHICLE_PHOTOS}
            </span>
          </label>

          <div className="vehicle-photo-strip">

            {images.map((file, index) => (
              <div
                className={`vehicle-photo-thumb ${
                  index === 0 ? "main-photo" : ""
                }`}
                key={`${file.name}-${index}`}
              >
                <img src={URL.createObjectURL(file)} alt={file.name} />
                {index === 0 ? (
                  <span className="main-photo-label">Main</span>
                ) : null}
                <button
                  type="button"
                  className="vehicle-photo-remove"
                  aria-label={`Remove photo ${index + 1}`}
                  onClick={() => removeImage(index)}
                  disabled={saving}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* LISTING */}
        <div className="form-section-title">
          <span>01</span>
          <div>
            <h2>{t("listing")}</h2>
            <p>{t("listingHint")}</p>
          </div>
        </div>

        <div className="form-grid">

          <div className={fieldClass("listingTypeId")} data-field="listingTypeId">
            <label htmlFor="listingTypeId">Listing Type</label>

            <select
              id="listingTypeId"
              name="listingTypeId"
              value={formData.listingTypeId}
              onChange={handleChange}
            >
              <option value="">
                Select Sale or Rent
              </option>

              {listingTypes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className={fieldClass("categoryId")} data-field="categoryId">
            <label htmlFor="categoryId">{t("category")}</label>

            <select
              id="categoryId"
              name="categoryId"
              value={formData.categoryId}
              onChange={handleChange}
            >
              <option value="">
                Select Category
              </option>

              {categories.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {lookupLabel(t, item)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field city-autocomplete">
            <label htmlFor="citySearch">City</label>
            <input
              id="citySearch"
              type="text"
              autoComplete="off"
              placeholder={t("typeCity")}
              value={cityQuery}
              onChange={handleCityQueryChange}
              onFocus={() => setCityOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setCityOpen(false), 160);
              }}
            />
            {cityOpen && citySuggestions.length > 0 ? (
              <ul className="city-suggest-list" role="listbox">
                {citySuggestions.map((city) => (
                  <li key={city.id}>
                    <button
                      type="button"
                      className="city-suggest-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pickCity(city)}
                    >
                      {city.name}
                      {city.countryName ? ` - ${city.countryName}` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

        </div>

        {/* VEHICLE */}
        <div className="form-section-title">
          <span>02</span>
          <div>
            <h2>Vehicle</h2>
            <p>Select the vehicle you want to publish.</p>
          </div>
        </div>

        <div className="form-grid">

          <div className={fieldClass("brand", "city-autocomplete")} data-field="brand">
            <label htmlFor="brandSearch">{t("brand")}</label>
            <input
              id="brandSearch"
              type="text"
              autoComplete="off"
              placeholder={t("typeBrand")}
              value={brandQuery}
              onChange={handleBrandQueryChange}
              onFocus={() => setBrandOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setBrandOpen(false), 160);
              }}
              disabled={saving}
            />
            {brandOpen && brandQuery.trim() ? (
              <ul className="city-suggest-list" role="listbox">
                {brandSuggestions.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      className="city-suggest-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pickBrandSuggestion(item)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
                {!brandSuggestions.some(
                  (item) =>
                    String(item.brand?.name || item.label || "")
                      .trim()
                      .toLowerCase() === brandQuery.trim().toLowerCase()
                ) ? (
                  <li>
                    <button
                      type="button"
                      className="city-suggest-item city-suggest-custom"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setBrandOpen(false);
                        markFilled("brand");
                      }}
                    >
                      {t("useTyped", { name: brandQuery.trim() })}
                    </button>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>

          <div className={fieldClass("model", "city-autocomplete")} data-field="model">
            <label htmlFor="modelSearch">{t("model")}</label>
            <input
              id="modelSearch"
              type="text"
              autoComplete="off"
              placeholder={t("typeModel")}
              value={modelQuery}
              onChange={handleModelQueryChange}
              onFocus={() => setModelOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setModelOpen(false), 160);
              }}
              disabled={saving}
            />
            {modelOpen && modelQuery.trim() ? (
              <ul className="city-suggest-list" role="listbox">
                {modelSuggestions.map((model) => (
                  <li key={model.id}>
                    <button
                      type="button"
                      className="city-suggest-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pickModel(model)}
                    >
                      {model.name}
                    </button>
                  </li>
                ))}
                {!modelSuggestions.some(
                  (model) =>
                    String(model.name || "").trim().toLowerCase() ===
                    modelQuery.trim().toLowerCase()
                ) ? (
                  <li>
                    <button
                      type="button"
                      className="city-suggest-item city-suggest-custom"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setModelOpen(false);
                        markFilled("model");
                      }}
                    >
                      {t("useTyped", { name: modelQuery.trim() })}
                    </button>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>

          <div className="form-field">
            <label htmlFor="bodyTypeId">Body Type</label>

            <select
              id="bodyTypeId"
              name="bodyTypeId"
              value={formData.bodyTypeId}
              onChange={handleChange}
            >
              <option value="">
                Select Body Type
              </option>

              {bodyTypes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="colorId">{t("color")}</label>
            <ColorSelect
              id="colorId"
              name="colorId"
              value={formData.colorId}
              colors={colors}
              placeholder={t("selectColor")}
              disabled={saving}
              onChange={handleChange}
            />
          </div>

        </div>

        {/* SPECIFICATIONS */}
        <div className="form-section-title">
          <span>03</span>
          <div>
            <h2>{t("specs")}</h2>
            <p>
              {t("specsHint")}
            </p>
          </div>
        </div>

        <div className="form-grid">

          <div className="form-field">
            <label htmlFor="fuelTypeId">Fuel Type</label>

            <select
              id="fuelTypeId"
              name="fuelTypeId"
              value={formData.fuelTypeId}
              onChange={handleChange}
            >
              <option value="">
                Select Fuel Type
              </option>

              {fuelTypes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="transmissionId">{t("transmission")}</label>

            <select
              id="transmissionId"
              name="transmissionId"
              value={formData.transmissionId}
              onChange={handleChange}
            >
              <option value="">
                Select Transmission
              </option>

              {transmissions.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {lookupLabel(t, item)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="driveTypeId">{t("driveType")}</label>

            <select
              id="driveTypeId"
              name="driveTypeId"
              value={formData.driveTypeId}
              onChange={handleChange}
            >
              <option value="">
                Select Drive Type
              </option>

              {driveTypes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {lookupLabel(t, item)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="engine">Engine</label>

            <input
              id="engine"
              type="text"
              name="engine"
              value={formData.engine}
              onChange={handleChange}
              placeholder="e.g. 2.0 Diesel"
            />
          </div>

          <div className="form-field">
            <label htmlFor="cylinders">Cylinders</label>

            <input
              id="cylinders"
              type="number"
              name="cylinders"
              value={formData.cylinders}
              onChange={handleChange}
              placeholder="e.g. 4"
              min="0"
            />
          </div>

          <div className="form-field">
            <label htmlFor="powerHP">Power HP</label>

            <input
              id="powerHP"
              type="number"
              name="powerHP"
              value={formData.powerHP}
              onChange={handleChange}
              placeholder="e.g. 190"
              min="0"
            />
          </div>

          <div className="form-field">
            <label htmlFor="powerKW">Power KW</label>

            <input
              id="powerKW"
              type="number"
              name="powerKW"
              value={formData.powerKW}
              onChange={handleChange}
              placeholder="e.g. 140"
              min="0"
            />
          </div>

          <div className="form-field">
            <label htmlFor="seats">Seats (optional)</label>

            <input
              id="seats"
              type="number"
              name="seats"
              value={formData.seats}
              onChange={handleChange}
              placeholder="e.g. 5"
              min="1"
            />
          </div>

        </div>

        {/* PRICE */}
        <div className="form-section-title">
          <span>04</span>
          <div>
            <h2>{t("priceDetails")}</h2>
            <p>
              {t("priceHint")}
            </p>
          </div>
        </div>

        <div className="form-grid">

          <div className={fieldClass("year")} data-field="year">
            <label htmlFor="year">Year</label>

            <input
              id="year"
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder="e.g. 2020"
              min="1900"
              max="2100"
            />
          </div>

          <div className="form-field">
            <label htmlFor="mileage">Mileage</label>

            <div className="input-with-unit">
              <input
                id="mileage"
                type="number"
                name="mileage"
                value={formData.mileage}
                onChange={handleChange}
                placeholder="e.g. 120000"
                min="0"
              />

              <span>km</span>
            </div>
          </div>

          <div className={fieldClass("price", "price-field")} data-field="price">
            <label htmlFor="price">Price</label>

            <div className="input-with-unit">
              <input
                id="price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g. 25000"
                min="0"
              />

              <span>€</span>
            </div>
          </div>

        </div>

        <LegalConsent
          id="listing-consent"
          checked={listingConsent}
          onChange={(checked) => {
            setListingConsent(checked);
            if (checked) markFilled("consent");
          }}
        >
          <ListingConsentText />
        </LegalConsent>

        {/* BUTTONS */}
        <div className="form-actions">

          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate(-1)}
            disabled={
              saving || uploadingImages
            }
          >
            {t("cancel")}
          </button>

          <button
            type="submit"
            className="submit-button"
            disabled={
              saving || uploadingImages
            }
          >
            {saving
              ? t("saving")
              : uploadingImages
              ? t("uploadingPhotos")
              : t("publish")}
          </button>

        </div>

      </form>
    </div>
  );
};