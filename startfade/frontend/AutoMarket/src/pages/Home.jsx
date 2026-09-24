import "./Home.css";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Banner } from "../components/Banner";
import { VehicleSearch } from "../components/VehicleSearch";
import { VehicleResults } from "../components/VehicleResults";
import { AdvertisementCard, AdvertisementOffers, PromotedVehicleCard } from "../components/AdvertisementCard";
import { mediaUrl } from "../utils/mediaUrl";
import { PublisherChip, publisherFrom } from "../components/PublisherChip";
import { FiArrowRight, FiPlus } from "react-icons/fi";
import { useAuth } from "@clerk/clerk-react";
import { useLanguage } from "../i18n/LanguageContext";
import { CompanyBannerSlot } from "../components/CompanyBannerSlot";
import { API_BASE } from "../config/api";

// =====================================================
// HELPERS
// =====================================================

const getVehicleBrand = (vehicle) => {
  return String(
    vehicle.brand ||
    vehicle.brandName ||
    vehicle.make ||
    vehicle.manufacturer ||
    ""
  ).toLowerCase().trim();
};

const getVehicleModel = (vehicle) => {
  return String(
    vehicle.model ||
    vehicle.modelName ||
    vehicle.title ||
    ""
  ).toLowerCase().trim();
};

const AD_SLOT_COUNT = 5;

function buildAdSlots(promoted) {
  const ads = Array.isArray(promoted) ? promoted : [];
  const slots = ads.map((ad) => ({ type: "ad", ad }));
  while (slots.length < AD_SLOT_COUNT) {
    slots.push({ type: "empty" });
  }
  return slots;
}

export const Home = () => {
  const { t } = useLanguage();
  const { isSignedIn } = useAuth();
  const [searchResults, setSearchResults] = useState(null);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [showAdOffers, setShowAdOffers] = useState(false);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Latest vehicles (auto rotating)
  const [latestVehicles, setLatestVehicles] = useState([]);
  const [isLatestSliding, setIsLatestSliding] = useState(false);

  // BMW (auto rotating)
  const [bmwVehicles, setBmwVehicles] = useState([]);
  const [isBmwSliding, setIsBmwSliding] = useState(false);

  // Mercedes (auto rotating)
  const [mercedesVehicles, setMercedesVehicles] = useState([]);
  const [isMercedesSliding, setIsMercedesSliding] = useState(false);

  // Golf (auto rotating)
  const [golfVehicles, setGolfVehicles] = useState([]);
  const [isGolfSliding, setIsGolfSliding] = useState(false);

  // Advertisement slots (5 visible, auto rotating)
  const [adSlots, setAdSlots] = useState(() => buildAdSlots([]));
  const [isAdsSliding, setIsAdsSliding] = useState(false);
  const [companyBanners, setCompanyBanners] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPromotedAds() {
      const paid = searchParams.get("paid");
      const sessionId = searchParams.get("session_id");
      let verified = !sessionId;
      try {
        if (sessionId) {
          const verify = await fetch(`${API_BASE}/Payments/verify-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          verified = verify.ok;
        }
        const [adsResponse, bannerResponse] = await Promise.all([
          fetch(`${API_BASE}/Advertisements/active`),
          fetch(`${API_BASE}/CompanyBanners/active`),
        ]);
        const data = adsResponse.ok ? await adsResponse.json().catch(() => []) : [];
        const banner = bannerResponse.ok ? await bannerResponse.json().catch(() => []) : [];
        if (!cancelled) {
          setAdSlots(buildAdSlots(Array.isArray(data) ? data : []));
          setCompanyBanners(Array.isArray(banner) ? banner : banner?.imageUrl ? [banner] : []);
        }
      } catch (err) {
        console.error("Error loading advertisements:", err);
      } finally {
        if (!cancelled && verified && (paid || sessionId)) {
          setSearchParams({}, { replace: true });
        }
      }
    }

    loadPromotedAds();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams]);

  // =====================================================
  // GET VEHICLES
  // =====================================================

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoadingVehicles(true);

        const response = await fetch(`${API_BASE}/Vehicles`);

        if (!response.ok) {
          throw new Error("Failed to load vehicles");
        }

        const data = await response.json();

        const vehicleData = Array.isArray(data)
          ? data
          : data.items || data.data || [];

        // Latest vehicles
        const sortedVehicles = [...vehicleData]
          .sort((a, b) => {
            const dateA = new Date(
              a.createdAt || a.publishedAt || a.CreatedAt || 0
            );
            const dateB = new Date(
              b.createdAt || b.publishedAt || b.CreatedAt || 0
            );
            return dateB - dateA;
          })
          .slice(0, 15);

        setLatestVehicles(sortedVehicles);

        // BMW
        const bmwList = vehicleData
          .filter((vehicle) => getVehicleBrand(vehicle) === "bmw")
          .slice(0, 15);

        setBmwVehicles(bmwList);

        // Mercedes
        const mercedesList = vehicleData
          .filter((vehicle) => {
            const brand = getVehicleBrand(vehicle);
            return brand === "mercedes" || brand === "mercedes-benz";
          })
          .slice(0, 15);

        setMercedesVehicles(mercedesList);

        // Volkswagen Golf
        const golfList = vehicleData
          .filter((vehicle) => {
            const brand = getVehicleBrand(vehicle);
            const model = getVehicleModel(vehicle);
            return (
              (brand === "volkswagen" || brand === "vw") &&
              model.includes("golf")
            );
          })
          .slice(0, 15);

        setGolfVehicles(golfList);

      } catch (error) {
        console.error("Error loading vehicles:", error);
      } finally {
        setLoadingVehicles(false);
      }
    };

    fetchVehicles();
  }, []);

  // =====================================================
  // GENERIC AUTO ROTATE
  // =====================================================

  const useAutoRotate = (length, setList, setSliding, intervalMs = 12000) => {
    useEffect(() => {
      if (length < 2) {
        return;
      }

      const interval = setInterval(() => {
        setSliding(true);

        setTimeout(() => {
          setList((prev) => {
            if (prev.length < 2) {
              return prev;
            }
            return [...prev.slice(1), prev[0]];
          });

          setSliding(false);
        }, 700);
      }, intervalMs);

      return () => {
        clearInterval(interval);
      };
    }, [length]);
  };

  useAutoRotate(latestVehicles.length, setLatestVehicles, setIsLatestSliding);
  useAutoRotate(bmwVehicles.length, setBmwVehicles, setIsBmwSliding);
  useAutoRotate(mercedesVehicles.length, setMercedesVehicles, setIsMercedesSliding);
  useAutoRotate(golfVehicles.length, setGolfVehicles, setIsGolfSliding);
  useAutoRotate(adSlots.length, setAdSlots, setIsAdsSliding);

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearchResults = (data) => {
    setSearchResults(data);
  };

  const handleBack = () => {
    setSearchResults(null);
  };

  const handleCarouselWheel = (event) => {
    const el = event.currentTarget;

    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
      return;
    }

    event.preventDefault();
    el.scrollLeft += event.deltaY;
  };

  const handleCarouselPointerDown = (event) => {
    if (event.pointerType === "touch") {
      return;
    }

    const el = event.currentTarget;
    el.dataset.dragging = "false";
    el.dataset.didDrag = "false";
    el.dataset.startX = String(event.clientX);
    el.dataset.startScroll = String(el.scrollLeft);
  };

  const handleCarouselPointerMove = (event) => {
    const el = event.currentTarget;

    if (el.dataset.startX == null || el.dataset.startX === "") {
      return;
    }

    const startX = Number(el.dataset.startX);
    const delta = event.clientX - startX;

    if (el.dataset.dragging !== "true") {
      if (Math.abs(delta) < 8) {
        return;
      }

      el.dataset.dragging = "true";
      el.dataset.didDrag = "true";
      el.setPointerCapture(event.pointerId);
    }

    const startScroll = Number(el.dataset.startScroll);
    el.scrollLeft = startScroll - delta;
  };

  const handleCarouselPointerUp = (event) => {
    const el = event.currentTarget;

    if (el.hasPointerCapture?.(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }

    el.dataset.dragging = "false";
    el.dataset.startX = "";

    window.setTimeout(() => {
      el.dataset.didDrag = "false";
    }, 0);
  };

  const runSearch = async (filters) => {
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "20",
        ...filters,
      });

      const response = await fetch(
        `${API_BASE}/Vehicles/search?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Search request failed");
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Home search error:", error);
    }
  };

  // =====================================================
  // VEHICLE CARD
  // =====================================================
  const VehicleCard = ({ vehicle }) => {
    const rawImage =
      vehicle.images?.[0] ||
      vehicle.imageUrl ||
      vehicle.mainImageUrl ||
      vehicle.image;

    const image = rawImage ? mediaUrl(rawImage) : "";

    const title =
      vehicle.title ||
      [vehicle.brandName || vehicle.brand, vehicle.modelName || vehicle.model]
        .filter(Boolean)
        .join(" ");

    const fuel =
      vehicle.fuelTypeName ||
      vehicle.fuelType ||
      vehicle.fuel;

    const publisher = publisherFrom(vehicle);

    const handleVehicleClick = (event) => {
      const carousel = event.currentTarget.closest(".carousel-container");

      if (carousel?.dataset.didDrag === "true") {
        event.preventDefault();
      }
    };

    if (!vehicle?.id) {
      return null;
    }

    return (
      <Link
        to={`/vehicles/${vehicle.id}`}
        className="home-vehicle-card"
        onClick={handleVehicleClick}
      >
        <div className="home-vehicle-image">
          {image ? (
            <img src={image} alt={title || "Vehicle"} />
          ) : (
            <div className="home-no-image">
              No image available
            </div>
          )}
        </div>

        <div className="home-vehicle-content">
          <h3>{title || "Vehicle"}</h3>

          <div className="home-vehicle-details">
            {vehicle.year && <span>{vehicle.year}</span>}

            {fuel && <span>{fuel}</span>}

            {vehicle.mileage && (
              <span>
                {Number(vehicle.mileage).toLocaleString()} km
              </span>
            )}
          </div>

          {publisher && (
            <div className="home-vehicle-publisher">
              <PublisherChip
                variant="name"
                userId={publisher.userId}
                name={publisher.name}
                menuPlacement="top"
              />
            </div>
          )}

          <div className="home-vehicle-price">
            {vehicle.price
              ? `€${Number(vehicle.price).toLocaleString()}`
              : "Price on request"}
          </div>
        </div>
      </Link>
    );
  };

  // =====================================================
  // AUTO-ROTATING SECTION (BMW / Mercedes / Golf)
  // =====================================================

  const VehicleSection = ({
    eyebrow,
    title,
    description,
    vehicleList,
    isSliding,
    onViewMore,
  }) => {
    if (!loadingVehicles && vehicleList.length === 0) {
      return null;
    }

    return (
      <section className="vehicle-section">
        <div className="vehicle-section-header">
          <div>
            <span className="section-eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>

        <div
          className="carousel-container"
          onWheel={handleCarouselWheel}
          onPointerDown={handleCarouselPointerDown}
          onPointerMove={handleCarouselPointerMove}
          onPointerUp={handleCarouselPointerUp}
          onPointerCancel={handleCarouselPointerUp}
        >
          {loadingVehicles ? (
            <div className="vehicles-loading">Loading vehicles...</div>
          ) : (
            <div className={`carousel-track${isSliding ? " sliding" : ""}`}>
              {vehicleList.map((vehicle, index) => (
                <div className="carousel-item" key={`${vehicle.id}-${index}`}>
                  <VehicleCard vehicle={vehicle} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="vehicle-section-footer">
          <button
            type="button"
            className="view-more-link"
            onClick={onViewMore}
          >
            {t("viewMore")}
            <FiArrowRight />
          </button>
        </div>
      </section>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="home-page">
      <Banner />

      {!searchResults ? (
        <>
          <VehicleSearch onSearchResults={handleSearchResults} />

          <section className="advertisements">
            <div
              className={`advertisements-row${
                adSlots.some((slot) => slot.type === "empty") ? "" : " ads-full"
              }`}
            >
              <div className="ads-track-container">
                <div
                  className={`ads-track${isAdsSliding ? " ads-sliding" : ""}`}
                >
                  {adSlots.map((slot, index) => (
                    <div
                      className="ads-track-item"
                      key={slot.ad?.id ?? `empty-${index}`}
                    >
                      {slot.type === "ad" ? (
                        <PromotedVehicleCard ad={slot.ad} />
                      ) : (
                        <AdvertisementCard
                          onPromote={() => setShowAdOffers(true)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {!adSlots.some((slot) => slot.type === "empty") && (
                <div className="ads-promote-aside">
                  <AdvertisementCard
                    compact
                    onPromote={() => setShowAdOffers(true)}
                  />
                </div>
              )}
            </div>

            <AdvertisementOffers
              open={showAdOffers}
              onClose={() => setShowAdOffers(false)}
            />
          </section>

          {/* LATEST VEHICLES */}
          <section className="vehicle-section">
            <div className="vehicle-section-header vehicle-section-header--latest">
              <div>
                <span className="section-eyebrow">{t("homeJustArrived")}</span>
                <h2>{t("homeLatest")}</h2>
                <p>{t("homeLatestDesc")}</p>
              </div>
              <button
                type="button"
                className="home-add-car-btn"
                aria-label={t("homePostCar")}
                onClick={() =>
                  navigate(
                    isSignedIn
                      ? "/add-vehicle"
                      : "/login?redirect=/add-vehicle"
                  )
                }
              >
                <span className="home-add-car-copy">
                  <span className="home-add-car-kicker">{t("homePostCarKicker")}</span>
                  <span className="home-add-car-title">{t("homePostCar")}</span>
                </span>
                <span className="home-add-car-plus" aria-hidden="true">
                  <FiPlus />
                </span>
              </button>
            </div>

            <div
              className="carousel-container"
              onWheel={handleCarouselWheel}
              onPointerDown={handleCarouselPointerDown}
              onPointerMove={handleCarouselPointerMove}
              onPointerUp={handleCarouselPointerUp}
              onPointerCancel={handleCarouselPointerUp}
            >
              <div className={`carousel-track${isLatestSliding ? " sliding" : ""}`}>
                {latestVehicles.map((vehicle, index) => (
                  <div className="carousel-item" key={`${vehicle.id}-${index}`}>
                    <VehicleCard vehicle={vehicle} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* BMW */}
          <VehicleSection
            eyebrow={t("popularBrand")}
            title={t("bmwTitle")}
            description={t("bmwDesc")}
            vehicleList={bmwVehicles}
            isSliding={isBmwSliding}
            onViewMore={() => {
              const brandId = bmwVehicles[0]?.brandId;
              if (brandId) {
                runSearch({ brandId: String(brandId) });
              } else {
                runSearch({ search: "BMW" });
              }
            }}
          />

          <CompanyBannerSlot banners={companyBanners} />

          {/* MERCEDES */}
          <VehicleSection
            eyebrow={t("premiumCars")}
            title={t("mercedesTitle")}
            description={t("marcedesDesc")}
            vehicleList={mercedesVehicles}
            isSliding={isMercedesSliding}
            onViewMore={() => {
              const brandId = mercedesVehicles[0]?.brandId;
              if (brandId) {
                runSearch({ brandId: String(brandId) });
              } else {
                runSearch({ search: "Mercedes" });
              }
            }}
          />

          {/* GOLF */}
          <VehicleSection
            eyebrow={t("mostWanted")}
            title={t("golfTitle")}
            description={t("golfDesc")}
            vehicleList={golfVehicles}
            isSliding={isGolfSliding}
            onViewMore={() => {
              runSearch({ search: "Golf" });
            }}
          />

          {/* SEO */}
          <section className="home-seo-section">
            <div className="home-seo-content">
              <span>{t("seoEyebrow")}</span>
              <h2>{t("seoTitle")}</h2>
              <p>
                {t("seoP1")}
              </p>
              <p>
                {t("seoP2")}
              </p>
            </div>
          </section>
        </>
      ) : (
        <VehicleResults data={searchResults} onBack={handleBack} />
      )}

    </div>
  );
};