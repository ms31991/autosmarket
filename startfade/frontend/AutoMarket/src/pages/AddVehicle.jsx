import "./AddVehicle.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClerkToken } from "../services/clerkToken";
import {
  LegalConsent,
  ListingConsentText,
} from "../components/LegalConsent";
import { useLanguage } from "../i18n/LanguageContext";
import { API_BASE } from "../config/api";
import { compressImageFile } from "../utils/compressImage";

export const AddVehicle = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

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
    engineCC: "",
    powerHP: "",
    powerKW: "",
    cylinders: "",
    seats: "",
  });

  const [catalogVariants, setCatalogVariants] = useState([]);
  const [catalogVariantId, setCatalogVariantId] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogStatus, setCatalogStatus] = useState("");

  const [images, setImages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [listingConsent, setListingConsent] = useState(false);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  async function checkAuthAndFetch() {
    const token = await getClerkToken();

    if (!token) {
      setError(t("notLoggedIn"));
      setLoading(false);
      return;
    }

    fetchDropdownData();
  }

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

      const carCategory = data[1].find((item) => {
        const name = String(item.name || "").toLowerCase();
        const slug = String(item.slug || "").toLowerCase();
        return slug === "car" || name === "car";
      });
      if (carCategory) {
        setFormData((previous) =>
          previous.categoryId
            ? previous
            : { ...previous, categoryId: String(carCategory.id) }
        );
      }

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

    setError("");
    setSuccess("");
  }

  function handleBrandChange(e) {
    const brandId = e.target.value;

    setFormData((previous) => ({
      ...previous,
      brandId,
      modelId: "",
    }));
    setCatalogVariants([]);
    setCatalogVariantId("");
    setCatalogStatus("");

    setError("");
    setSuccess("");
  }

  function handleModelChange(e) {
    const modelId = e.target.value;

    setFormData((previous) => ({
      ...previous,
      modelId,
    }));
    setCatalogVariants([]);
    setCatalogVariantId("");
    setCatalogStatus("");

    setError("");
    setSuccess("");
  }

  useEffect(() => {
    const brand = brands.find(
      (item) => Number(item.id) === Number(formData.brandId)
    );
    const model = models.find(
      (item) => Number(item.id) === Number(formData.modelId)
    );

    if (!brand?.name || !model?.name) {
      return;
    }

    let cancelled = false;

    async function loadCatalogVariants() {
      try {
        setCatalogLoading(true);
        setCatalogStatus("Po kërkojmë variantet në katalog…");

        const response = await fetch(
          `${API_BASE}/Catalog/variants?brand=${encodeURIComponent(brand.name)}&model=${encodeURIComponent(model.name)}`
        );
        const data = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (!response.ok) {
          setCatalogVariants([]);
          setCatalogStatus(
            data.message || "Katalogu nuk u lexua. Mund t’i plotësosh fushat vetë."
          );
          return;
        }

        const variants = data.variants || [];
        setCatalogVariants(variants);

        if (!variants.length) {
          setCatalogStatus(
            "Nuk u gjet variant në katalog. Plotëso specifikat vetë."
          );
          fillBodyTypeFromHints(model.name, []);
          return;
        }

        fillBodyTypeFromHints(
          model.name,
          variants.map((item) => item.bodyType).filter(Boolean)
        );

        setCatalogStatus(
          "Zgjidh variantin (p.sh. 320i) — fushat plotësohen, por mund t’i ndryshosh."
        );
      } catch (err) {
        if (cancelled) return;
        setCatalogVariants([]);
        setCatalogStatus(
          err.message || "Katalogu nuk u lexua. Mund t’i plotësosh fushat vetë."
        );
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }

    loadCatalogVariants();

    return () => {
      cancelled = true;
    };
  }, [formData.brandId, formData.modelId, brands, models, bodyTypes]);

  async function handleCatalogVariantChange(e) {
    const variantId = e.target.value;
    setCatalogVariantId(variantId);

    if (!variantId) return;

    try {
      setCatalogLoading(true);
      const response = await fetch(
        `${API_BASE}/Catalog/variants/${variantId}`
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message || "Specifikat e variantit nuk u morën.");
        return;
      }

      const fields = data.fields || {};
      setFormData((previous) => ({
        ...previous,
        bodyTypeId:
          fields.bodyTypeId != null
            ? String(fields.bodyTypeId)
            : previous.bodyTypeId,
        fuelTypeId:
          fields.fuelTypeId != null
            ? String(fields.fuelTypeId)
            : previous.fuelTypeId,
        transmissionId:
          fields.transmissionId != null
            ? String(fields.transmissionId)
            : previous.transmissionId,
        driveTypeId:
          fields.driveTypeId != null
            ? String(fields.driveTypeId)
            : previous.driveTypeId,
        engine:
          fields.engine != null && fields.engine !== ""
            ? String(fields.engine)
            : previous.engine,
        engineCC:
          fields.engineCC != null ? String(fields.engineCC) : previous.engineCC,
        cylinders:
          fields.cylinders != null
            ? String(fields.cylinders)
            : previous.cylinders,
        powerHP:
          fields.powerHP != null ? String(fields.powerHP) : previous.powerHP,
        powerKW:
          fields.powerKW != null ? String(fields.powerKW) : previous.powerKW,
        seats: fields.seats != null ? String(fields.seats) : previous.seats,
        year: fields.year != null ? String(fields.year) : previous.year,
      }));
      setError("");
      setCatalogStatus(
        "Specifikat u plotësuan nga katalogu. Mund t’i ndryshosh para publikimit."
      );
    } catch (err) {
      setError(err.message || "Specifikat e variantit nuk u morën.");
    } finally {
      setCatalogLoading(false);
    }
  }

  const filteredModels = formData.brandId
    ? models.filter(
        (model) =>
          Number(model.brandId) === Number(formData.brandId)
      )
    : [];

  const selectedColor = colors.find(
    (color) =>
      Number(color.id) === Number(formData.colorId)
  );

  function cityLabel(city) {
    if (!city) return "";
    return city.countryName ? `${city.name} - ${city.countryName}` : city.name;
  }

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

  function normalizePlace(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
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

  function matchBodyType(bodyTypeList, hints) {
    if (!bodyTypeList?.length || !hints?.length) return null;
    const normalizedHints = hints.map(normalizePlace).filter(Boolean);
    const scored = bodyTypeList
      .map((item) => {
        const name = normalizePlace(item.name);
        let score = 0;
        for (const hint of normalizedHints) {
          if (name === hint) score = Math.max(score, 100);
          else if (name.includes(hint) || hint.includes(name)) {
            score = Math.max(score, 70);
          }
        }
        return { item, score };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.item || null;
  }

  function fillBodyTypeFromHints(modelName, catalogBodies) {
    const modelHints = [];
    const model = normalizePlace(modelName);
    if (/(suv|crossover|x[1-7]|q[237]|gl[abcse]|touareg|tiguan|sportage|tucson|rav4)/.test(model)) {
      modelHints.push("suv");
    }
    if (/(hatch|golf|polo|fiesta|clio|civic)/.test(model)) modelHints.push("hatchback");
    if (/(coupe|911|mustang)/.test(model)) modelHints.push("coupe");
    if (/(cabrio|convertible)/.test(model)) modelHints.push("cabriolet");
    if (/(touran|sharan|van|transporter)/.test(model)) modelHints.push("van");
    if (/(sedan|passat|accord|camry|3series|5series|eclass|cclass)/.test(model)) {
      modelHints.push("sedan");
    }

    const counts = {};
    for (const name of catalogBodies) {
      const key = normalizePlace(name);
      if (!key) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
    const topCatalog = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const matched = matchBodyType(bodyTypes, [
      topCatalog,
      ...catalogBodies,
      ...modelHints,
    ]);
    if (!matched) return;
    setFormData((previous) =>
      previous.bodyTypeId
        ? previous
        : { ...previous, bodyTypeId: String(matched.id) }
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

    setImages((previous) => [...previous, ...validFiles]);
    e.target.value = "";
  }

  function removeImage(index) {
    setImages((previous) =>
      previous.filter(
        (_, imageIndex) => imageIndex !== index
      )
    );
  }

  async function uploadVehicleImages(vehicleId) {
    if (images.length === 0) return;

    try {
      setUploadingImages(true);

      const token = await getClerkToken();

      for (let i = 0; i < images.length; i++) {
        const file = images[i];

        const uploadData = new FormData();
        uploadData.append("file", file);

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

        const responseText = await response.text();

        if (!response.ok) {
          let message =
            `Fotoja ${file.name} nuk u uploadua.`;

          try {
            const errorData =
              JSON.parse(responseText);

            if (errorData.message) {
              message = errorData.message;
            }
          } catch {
            if (responseText) {
              message = responseText;
            }
          }

          throw new Error(message);
        }
      }
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const token = await getClerkToken();

    if (!token) {
      setError(t("notLoggedIn"));
      return;
    }

    if (images.length < 2) {
      setError(t("photosMin"));
      return;
    }

    if (!formData.listingTypeId) {
      setError(t("pickSaleRent"));
      return;
    }

    if (!formData.categoryId) {
      setError(t("pickCategory"));
      return;
    }

    if (!formData.brandId) {
      setError(t("pickBrand"));
      return;
    }

    if (!formData.modelId) {
      setError(t("pickModel"));
      return;
    }

    if (!formData.price) {
      setError(t("priceRequired"));
      return;
    }

    if (!formData.year) {
      setError(t("yearRequired"));
      return;
    }

    if (!listingConsent) {
      setError(t("listingConsentErr"));
      return;
    }

    try {
      setSaving(true);
      setVerifying(true);

      const vehicleData = {
        listingTypeId: Number(formData.listingTypeId),
        categoryId: Number(formData.categoryId),
        brandId: Number(formData.brandId),
        modelId: Number(formData.modelId),

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
        engineCC: getNumberOrNull(formData.engineCC),
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

        try {
          const errorData =
            JSON.parse(responseText);

          if (errorData.message) {
            message = errorData.message;
          }
        } catch {
          if (responseText) {
            message = responseText;
          }
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

      if (images.length > 0) {
        try {
          await uploadVehicleImages(vehicleId);
        } catch (imageError) {
          console.error(
            "IMAGE UPLOAD ERROR:",
            imageError
          );

          setSuccess(
            "Vehicle u krijua, por disa foto nuk u uploaduan."
          );

          setTimeout(() => {
            navigate("/my-vehicles");
          }, 1500);

          return;
        }
      }

      setSuccess(
        images.length > 0
          ? "Vehicle dhe fotot u ruajtën me sukses!"
          : "Vehicle u krijua me sukses!"
      );

      setFormData({
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
        engineCC: "",
        powerHP: "",
        powerKW: "",
        cylinders: "",
        seats: "",
      });

      setImages([]);
      setCityQuery("");

      setTimeout(() => {
        navigate("/my-vehicles");
      }, 1000);
    } catch (err) {
      console.error("CREATE VEHICLE ERROR:", err);

      setError(
        err.message ||
          "Ndodhi një gabim gjatë krijimit të veturës."
      );
      setVerifying(false);
    } finally {
      setSaving(false);
    }
  }

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

          <label className={`photo-add-circle-wrap${images.length < 2 ? " photo-add-needed" : ""}`}>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageChange}
              disabled={saving}
            />
            <span className="photo-add-circle" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="photo-add-count">
              {images.length}/2
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

          <div className="form-field">
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

          <div className="form-field">
            <label htmlFor="categoryId">Category</label>

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
                  {item.name}
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
              placeholder="Type a city, e.g. Str"
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
                      <span>{city.name}</span>
                      {city.countryName ? (
                        <span className="city-suggest-country">
                          {city.countryName}
                        </span>
                      ) : null}
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

          <div className="form-field">
            <label htmlFor="brandId">Brand</label>

            <select
              id="brandId"
              name="brandId"
              value={formData.brandId}
              onChange={handleBrandChange}
            >
              <option value="">
                Select Brand
              </option>

              {brands.map((brand) => (
                <option
                  key={brand.id}
                  value={brand.id}
                >
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="modelId">Model</label>

            <select
              id="modelId"
              name="modelId"
              value={formData.modelId}
              onChange={handleModelChange}
              disabled={!formData.brandId}
            >
              <option value="">
                {formData.brandId
                  ? "Select Model"
                  : "First select Brand"}
              </option>

              {filteredModels.map((model) => (
                <option
                  key={model.id}
                  value={model.id}
                >
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field form-field-wide">
            <label htmlFor="catalogVariantId">Variant / trim (optional)</label>
            <select
              id="catalogVariantId"
              value={catalogVariantId}
              onChange={handleCatalogVariantChange}
              disabled={!formData.modelId || catalogLoading || !catalogVariants.length}
            >
              <option value="">
                {!formData.modelId
                  ? "First select Model"
                  : catalogLoading
                    ? "Loading catalog…"
                    : catalogVariants.length
                      ? "Select variant (optional)"
                      : "No catalog variants"}
              </option>
              {catalogVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.label}
                </option>
              ))}
            </select>
            {catalogStatus ? (
              <p className="catalog-hint">{catalogStatus}</p>
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
            <label htmlFor="colorId">Color</label>

            <select
              id="colorId"
              name="colorId"
              value={formData.colorId}
              onChange={handleChange}
            >
              <option value="">
                Select Color
              </option>

              {colors.map((color) => (
                <option
                  key={color.id}
                  value={color.id}
                >
                  {color.name}
                </option>
              ))}
            </select>

            {selectedColor?.hexCode && (
              <div className="color-preview">
                <span
                  style={{
                    backgroundColor:
                      selectedColor.hexCode,
                  }}
                />
                {selectedColor.name}
              </div>
            )}
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
            <label htmlFor="transmissionId">Transmission</label>

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
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="driveTypeId">Drive Type</label>

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
                  {item.name}
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
            <label htmlFor="engineCC">Engine CC</label>

            <input
              id="engineCC"
              type="number"
              name="engineCC"
              value={formData.engineCC}
              onChange={handleChange}
              placeholder="e.g. 1995"
              min="0"
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

          <div className="form-field">
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

          <div className="form-field price-field">
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
          onChange={setListingConsent}
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
              saving || uploadingImages || !listingConsent
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