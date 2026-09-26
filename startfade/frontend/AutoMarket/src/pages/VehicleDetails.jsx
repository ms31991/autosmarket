import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import {
  Heart,
  Share2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  MessageCircle,
  Tag,
  Calendar,
  Gauge,
  Fuel,
  Settings,
  Zap,
  Users,
  MapPin,
  Car,
  ArrowLeft,
  X,
  Flag,
} from "lucide-react";

import { getClerkToken } from "../services/clerkToken";
import { createChatConnection } from "../services/signalRService";
import { ChatWindow } from "./ChatWindow";
import { personDisplayName } from "../utils/personName";
import { useAuth } from "../context/AuthContext";
import { SeoHead } from "../seo/SeoHead";
import { mediaUrl } from "../utils/mediaUrl";
import { API_BASE, API_ORIGIN } from "../config/api";
import { SITE_LOGO, ADSENSE_SLOT_DETAIL } from "../config/site";
import { apiFetch } from "../services/api";
import { useLanguage } from "../i18n/LanguageContext";
import { AdSenseBanner } from "../components/AdSenseBanner";
import "./VehicleDetails.css";

export const VehicleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const { dbUser } = useAuth();
  const { t } = useLanguage();

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeImage, setActiveImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const [showGallery, setShowGallery] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatConnection, setChatConnection] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("scam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState("");

  // ==========================================
  // FETCH VEHICLE
  // ==========================================

  useEffect(() => {
    fetchVehicle();
  }, [id]);

  const fetchVehicle = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/Vehicles/${id}`);

      if (!response.ok) {
        throw new Error("Vehicle not found");
      }

      const data = await response.json();

      setVehicle(data);

      if (data.isFavorite !== undefined) {
        setIsFavorite(Boolean(data.isFavorite));
      }
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      setVehicle(null);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CHECK FAVORITE
  // ==========================================

  useEffect(() => {
    if (!isSignedIn || !id) {
      setIsFavorite(false);
      return;
    }

    checkFavorite();
  }, [isSignedIn, id]);

  const checkFavorite = async () => {
    try {
      const token = await getClerkToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_BASE}/Favourites/check/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      setIsFavorite(Boolean(data.isFavourite));
    } catch (error) {
      console.error("Error checking favourite:", error);
    }
  };

  // ==========================================
  // IMAGES
  // ==========================================

  const getImages = () => {
    if (!vehicle) {
      return [];
    }

    if (
      vehicle.images &&
      Array.isArray(vehicle.images) &&
      vehicle.images.length > 0
    ) {
      return vehicle.images
        .map((image) => {
          if (typeof image === "string") {
            return image;
          }

          return (
            image.url ||
            image.imageUrl ||
            image.mediumUrl ||
            image.path ||
            ""
          );
        })
        .filter(Boolean);
    }

    if (vehicle.imageUrl) {
      return [vehicle.imageUrl];
    }

    return [];
  };

  const images = getImages();

  const getImageUrl = (image) => {
    if (!image) {
      return "";
    }

    if (
      image.startsWith("http://") ||
      image.startsWith("https://")
    ) {
      return image;
    }

    if (image.startsWith("/")) {
      return `${API_ORIGIN}${image}`;
    }

    return `${API_ORIGIN}/${image}`;
  };

  // ==========================================
  // IMAGE NAVIGATION
  // ==========================================

  const nextImage = () => {
    if (images.length <= 1) {
      return;
    }

    setActiveImage((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const previousImage = () => {
    if (images.length <= 1) {
      return;
    }

    setActiveImage((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  // ==========================================
  // FAVORITE
  // ==========================================

  const toggleFavorite = async () => {
    if (!isSignedIn || favoriteLoading) {
      return;
    }

    try {
      setFavoriteLoading(true);

      const token = await getClerkToken();

      if (!token) {
        return;
      }

      if (isFavorite) {
        const response = await fetch(
          `${API_BASE}/Favourites/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to remove favourite");
        }

        setIsFavorite(false);
      } else {
        const response = await fetch(
          `${API_BASE}/Favourites/${id}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);

          // Nëse backend thotë që ekziston,
          // e konsiderojmë favorite.
          if (
            response.status === 400 &&
            errorData?.message?.toLowerCase().includes("tashmë")
          ) {
            setIsFavorite(true);
            return;
          }

          throw new Error(
            errorData?.message || "Failed to add favourite"
          );
        }

        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Favourite error:", error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  // ==========================================
  // SHARE
  // ==========================================

  const handleShare = async () => {
    const title =
      vehicle?.title ||
      `${vehicle?.brand || ""} ${vehicle?.model || ""}`.trim() ||
      "Vehicle";

    const shareData = {
      title,
      text: `Check out this vehicle on AutoMarket`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          window.location.href
        );

        alert("Link copied!");
      }
    } catch (error) {
      // User cancelled share
      console.log("Share cancelled");
    }
  };

  const handleEditVehicle = () => {
    navigate(`/edit-vehicle/${id}`);
  };

  const handleDeleteVehicle = async () => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) {
      return;
    }

    try {
      const token = await getClerkToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`${API_BASE}/Vehicles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("The vehicle could not be deleted.");
      }

      navigate("/userprofile");
    } catch (error) {
      alert(error.message || "The vehicle could not be deleted.");
    }
  };

  const submitReport = async (event) => {
    event.preventDefault();
    if (!isSignedIn) {
      navigate("/login");
      return;
    }
    try {
      setReportBusy(true);
      setReportDone("");
      await apiFetch(`/Vehicles/${id}/report`, {
        method: "POST",
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails,
        }),
      });
      setReportDone(t("reportThanks"));
      setReportOpen(false);
      setReportDetails("");
    } catch (error) {
      setReportDone(error.message || t("reportListing"));
    } finally {
      setReportBusy(false);
    }
  };

  // ==========================================
  // OPEN CHAT
  // ==========================================

  const openChat = async () => {
    if (!vehicle || !isSignedIn || chatLoading) {
      return;
    }

    const sellerId = vehicle.ownerId || vehicle.userId;

    if (!sellerId) {
      console.error("Vehicle seller userId is missing.");
      return;
    }

    try {
      setChatLoading(true);

      const token = await getClerkToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_BASE}/Chat/conversation/${sellerId}?vehicleId=${id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          errorText || "Could not open conversation"
        );
      }

      const data = await response.json();

      if (!data.id) {
        throw new Error("Conversation ID missing");
      }

      const connection = createChatConnection();
      await connection.start();
      setChatConnection(connection);
      setChatConversationId(data.id);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setChatLoading(false);
    }
  };

  const closeChat = () => {
    chatConnection?.stop();
    setChatConnection(null);
    setChatConversationId(null);
  };

  // ==========================================
  // CLOSE GALLERY
  // ==========================================

  const closeGallery = () => {
    setShowGallery(false);
  };

  // ==========================================
  // KEYBOARD GALLERY CONTROLS
  // ==========================================

  useEffect(() => {
    if (!showGallery) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeGallery();
      }

      if (event.key === "ArrowRight") {
        nextImage();
      }

      if (event.key === "ArrowLeft") {
        previousImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow = "";
    };
  }, [showGallery, images.length]);

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="vehicle-loading">
        <SeoHead title="Vehicle" description="Vehicle listing on AutoMarket." />
        <div className="vehicle-loading-spinner" />
        <span>Loading vehicle...</span>
      </div>
    );
  }

  // ==========================================
  // NOT FOUND
  // ==========================================

  if (!vehicle) {
    return (
      <div className="vehicle-not-found">
        <SeoHead
          title="Vehicle not found"
          description="This vehicle listing is not available."
          noindex
        />
        <div className="vehicle-not-found-card">
          <Car size={45} />

          <h2>Vehicle not found</h2>

          <p>
            The vehicle you're looking for doesn't
            exist or has been removed.
          </p>

          <button onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VEHICLE DATA
  // ==========================================

  const vehicleTitle =
    vehicle.title ||
    [
      vehicle.brandName || vehicle.brand,
      vehicle.modelName || vehicle.model,
      vehicle.year,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Vehicle";

  const ownerKey = String(vehicle.ownerId || vehicle.userId || "");
  const isOwner = Boolean(
    dbUser &&
      ownerKey &&
      (ownerKey === String(dbUser.id) ||
        ownerKey === String(dbUser.clerkUserId) ||
        String(vehicle.ownerClerkUserId || "") === String(dbUser.clerkUserId || "") ||
        String(vehicle.ownerClerkUserId || "") === String(dbUser.id || ""))
  );

  const location = [
    vehicle.cityName || vehicle.city,
    vehicle.countryName || vehicle.country,
  ]
    .filter(Boolean)
    .join(", ");

  const formattedPrice = vehicle.price
    ? Number(vehicle.price).toLocaleString()
    : "0";

  const listedAt = vehicle.createdDate || vehicle.createdAt;

  const formattedDate = listedAt
    ? new Date(listedAt).toLocaleDateString()
    : null;

  const sellerId = vehicle.ownerId || vehicle.userId;
  const sellerName = personDisplayName({
    name: vehicle.ownerName,
    surname: vehicle.ownerSurname,
    userName: vehicle.ownerUserName || vehicle.userName || vehicle.sellerName,
  });

  const renderSellerCard = () =>
    sellerId ? (
      <div className="vehicle-seller-profile">
        <p className="vehicle-seller-label">Posted by</p>
        <PublisherChip
          variant="card"
          userId={sellerId}
          name={sellerName}
          image={vehicle.ownerProfileImage}
          subtitle="View profile"
        />
      </div>
    ) : null;

  const detailItems = [
    {
      label: "Year",
      value: vehicle.year || "-",
      icon: <Calendar size={19} />,
    },
    {
      label: "Mileage",
      value: vehicle.mileage
        ? `${Number(vehicle.mileage).toLocaleString()} km`
        : "-",
      icon: <Gauge size={19} />,
    },
    {
      label: "Fuel",
      value:
        vehicle.fuelTypeName ||
        vehicle.fuelType ||
        vehicle.fuel ||
        "-",
      icon: <Fuel size={19} />,
    },
    {
      label: "Gearbox",
      value:
        vehicle.transmissionName ||
        vehicle.transmission ||
        vehicle.gearbox ||
        "-",
      icon: <Settings size={19} />,
    },
    {
      label: "Power",
      value:
        vehicle.powerHP || vehicle.power
          ? `${vehicle.powerHP || vehicle.power} hp`
          : "-",
      icon: <Zap size={19} />,
    },
    {
      label: "Drivetrain",
      value:
        vehicle.driveTypeName ||
        vehicle.drivetrain ||
        vehicle.driveType ||
        "-",
      icon: <Car size={19} />,
    },
    {
      label: "Seats",
      value: vehicle.seats || "-",
      icon: <Users size={19} />,
    },
    {
      label: "Displacement",
      value:
        vehicle.engineCC || vehicle.engineSize
          ? `${vehicle.engineCC || vehicle.engineSize} cm³`
          : "-",
      icon: <Zap size={19} />,
    },
  
  ];

  return (
    <div className="vehicle-details-page">
      <SeoHead
        title={vehicleTitle}
        description={`${vehicleTitle}${location ? ` in ${location}` : ""}${
          vehicle.price ? ` · €${formattedPrice}` : ""
        }. Listed on AutoMarket.`}
        image={images[0] ? getImageUrl(images[0]) : SITE_LOGO}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Car",
          name: vehicleTitle,
          brand: vehicle.brandName || vehicle.brand || undefined,
          model: vehicle.modelName || vehicle.model || undefined,
          vehicleModelDate: vehicle.year ? String(vehicle.year) : undefined,
          mileageFromOdometer: vehicle.mileage
            ? {
                "@type": "QuantitativeValue",
                value: Number(vehicle.mileage),
                unitCode: "KMT",
              }
            : undefined,
          offers: vehicle.price
            ? {
                "@type": "Offer",
                price: Number(vehicle.price),
                priceCurrency: "EUR",
                availability: "https://schema.org/InStock",
              }
            : undefined,
          image: images[0] ? getImageUrl(images[0]) : undefined,
        }}
      />
       <button
    type="button"
    className="vehicle-back-button"
    onClick={() => navigate(-1)}
  >
    <ArrowLeft size={18} />
    <span>Back</span>
  </button>
      <div className="vehicle-details-container">

        {/* ==========================================
            MAIN COLUMN
        ========================================== */}

        <main className="vehicle-main-column">

          {/* ========================================
              GALLERY
          ======================================== */}

          <section className="vehicle-card vehicle-gallery-card">

            <div className="vehicle-gallery">

              {images.length > 0 ? (
                <>
                  <button
                    type="button"
                    className="vehicle-main-image-button"
                    onClick={() => setShowGallery(true)}
                    aria-label={`Enlarge photos of ${vehicleTitle}`}
                  >
                    <img
                      src={getImageUrl(
                        images[activeImage]
                      )}
                      alt={vehicleTitle}
                      className="vehicle-main-image"
                    />
                  </button>

                  <img
                    src={SITE_LOGO}
                    alt="AutoMarket"
                    className="vehicle-watermark"
                  />

                  <div className="vehicle-enlarge">
                    <Maximize2 size={13} />
                    <span>Click to enlarge</span>
                  </div>

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="gallery-arrow gallery-arrow-left"
                        onClick={previousImage}
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={22} />
                      </button>

                      <button
                        type="button"
                        className="gallery-arrow gallery-arrow-right"
                        onClick={nextImage}
                        aria-label="Next image"
                      >
                        <ChevronRight size={22} />
                      </button>
                    </>
                  )}

                  <div className="vehicle-image-counter">
                    {activeImage + 1} / {images.length}
                  </div>
                </>
              ) : (
                <div className="vehicle-no-image">
                  <Car size={50} />
                  <span>No image available</span>
                </div>
              )}

            </div>

            {images.length > 0 && (
              <div className="vehicle-thumbnails">

                {images.slice(0, 5).map(
                  (image, index) => (
                    <button
                      type="button"
                      key={`${image}-${index}`}
                      className={`vehicle-thumbnail ${
                        activeImage === index
                          ? "active"
                          : ""
                      }`}
                      aria-label={`Show photo ${index + 1} of ${vehicleTitle}`}
                      onClick={() =>
                        setActiveImage(index)
                      }
                    >
                      <img
                        src={getImageUrl(image)}
                        alt={`${vehicleTitle} ${
                          index + 1
                        }`}
                      />
                    </button>
                  )
                )}

                {images.length > 5 && (
                  <button
                    type="button"
                    className="vehicle-more-images"
                    onClick={() => setShowGallery(true)}
                  >
                    <span>
                      +{images.length - 5}
                    </span>

                    <small>photos</small>
                  </button>
                )}

              </div>
            )}

          </section>

          <AdSenseBanner slot={ADSENSE_SLOT_DETAIL} className="adsense-banner--detail" />

          {/* ========================================
              TITLE / HEADER
          ======================================== */}

          <section className="vehicle-card vehicle-title-card">

            <div className="vehicle-title-top">

              <div className="vehicle-title-info">

                <h1>{vehicleTitle}</h1>

                <div className="vehicle-badges">

                </div>

              </div>

              <div className="vehicle-actions">

                {/* Favorite vetëm për user të loguar */}

                {isSignedIn && (
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    disabled={favoriteLoading}
                    className={`vehicle-icon-button favorite ${
                      isFavorite ? "active" : ""
                    }`}
                    title={
                      isFavorite
                        ? "Remove from favourites"
                        : "Add to favourites"
                    }
                  >
                    <Heart
                      size={19}
                      fill={
                        isFavorite
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleShare}
                  className="vehicle-icon-button share"
                  title="Share"
                >
                  <Share2 size={19} />
                </button>

                {isOwner && (
                  <>
                    <button
                      type="button"
                      className="vehicle-owner-btn edit"
                      onClick={handleEditVehicle}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="vehicle-owner-btn delete"
                      onClick={handleDeleteVehicle}
                    >
                      Delete
                    </button>
                  </>
                )}

              </div>

            </div>

            <div className="vehicle-meta">

              {location && (
                <div className="vehicle-meta-item">
                  <MapPin size={15} />
                  <span>{location}</span>
                </div>
              )}

              {formattedDate && (
                <div className="vehicle-meta-item">
                  <Calendar size={15} />

                  <span>
                    Listed on {formattedDate}
                  </span>
                </div>
              )}

            </div>

          </section>

          {/* ========================================
              MOBILE MESSAGE
          ======================================== */}

          {(sellerId || isSignedIn) && (
            <div className="mobile-message-card">
              {renderSellerCard()}

              {isSignedIn && (
                <button
                  type="button"
                  className="vehicle-message-button"
                  onClick={openChat}
                  disabled={chatLoading}
                >
                  <div className="message-button-icon">
                    <MessageCircle size={21} />
                  </div>

                  <div className="message-button-content">
                    <strong>
                      {chatLoading
                        ? "Opening chat..."
                        : "Message seller"}
                    </strong>

                    <span>
                      Send a message directly to the seller
                    </span>
                  </div>

                  <ChevronRight
                    size={19}
                    className="message-button-arrow"
                  />
                </button>
              )}
            </div>
          )}

          {/* ========================================
              DETAILS
          ======================================== */}

          <section className="vehicle-card vehicle-specifications">

            <div className="vehicle-section-heading">
              <div>
                <span className="vehicle-section-label">
                </span>

                <h2>Details</h2>
              </div>
            </div>

            <div className="vehicle-details-grid">

              {detailItems.map((item, index) => (
                <div
                  className="vehicle-detail-item"
                  key={index}
                >
                  <div className="vehicle-detail-icon">
                    {item.icon}
                  </div>

                  <div className="vehicle-detail-content">
                    <p>{item.label}</p>

                    <strong>
                      {item.value}
                    </strong>
                  </div>
                </div>
              ))}

            </div>

          </section>

      
        </main>

        {/* ==========================================
            SIDEBAR
        ========================================== */}

        <aside className="vehicle-sidebar">

          <div className="vehicle-price-card">

            <span className="vehicle-sale-badge">
              <Tag size={13} />
              {vehicle.listingTypeName || "For sale"}
            </span>

            <div className="vehicle-price-section">

              <p>Price</p>

              <h2>
                {vehicle.currency || "CHF"}{" "}
                {formattedPrice}
              </h2>

            </div>

            <div className="vehicle-sidebar-divider" />

            {renderSellerCard()}

            {isSignedIn ? (
              <>
                <p className="vehicle-message-text">
                  Interested in this vehicle?
                  Message the seller directly.
                </p>

                <button
                  type="button"
                  className="vehicle-message-button sidebar-message"
                  onClick={openChat}
                  disabled={chatLoading}
                >
                  <MessageCircle size={19} />

                  <span>
                    {chatLoading
                      ? "Opening chat..."
                      : "Message seller"}
                  </span>
                </button>
              </>
            ) : (
              <div className="vehicle-login-message">

                <p>
                  Want to contact the seller?
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                >
                  Login to message
                </button>

              </div>
            )}

            <div className="vehicle-sidebar-divider" />

            {reportDone ? <p className="vehicle-report-done">{reportDone}</p> : null}

            {isSignedIn ? (
              reportOpen ? (
                <form className="vehicle-report-form" onSubmit={submitReport}>
                  <label htmlFor="report-reason">{t("reportReason")}</label>
                  <select
                    id="report-reason"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                  >
                    <option value="scam">{t("reportScam")}</option>
                    <option value="stolen">{t("reportStolen")}</option>
                    <option value="abuse">{t("reportAbuse")}</option>
                    <option value="other">{t("reportOther")}</option>
                  </select>
                  <label htmlFor="report-details">{t("reportDetails")}</label>
                  <textarea
                    id="report-details"
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                  />
                  <button type="submit" disabled={reportBusy}>
                    {t("reportSend")}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="vehicle-report-button"
                  onClick={() => setReportOpen(true)}
                >
                  <Flag size={16} />
                  {t("reportListing")}
                </button>
              )
            ) : (
              <button
                type="button"
                className="vehicle-report-button"
                onClick={() => navigate("/login")}
              >
                <Flag size={16} />
                {t("reportLogin")}
              </button>
            )}

          </div>

        </aside>

      </div>

      {/* ==========================================
          FULLSCREEN GALLERY
      ========================================== */}

      {showGallery && images.length > 0 && (
        <div
          className="fullscreen-gallery"
          onClick={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeGallery();
            }
          }}
        >

          <button
            type="button"
            className="fullscreen-close"
            onClick={closeGallery}
            aria-label="Close gallery"
          >
            <X size={25} />
          </button>

          {images.length > 1 && (
            <button
              type="button"
              className="fullscreen-arrow fullscreen-left"
              onClick={previousImage}
              aria-label="Previous image"
            >
              <ChevronLeft size={30} />
            </button>
          )}

          <img
            src={getImageUrl(
              images[activeImage]
            )}
            alt={vehicleTitle}
            className="fullscreen-image"
          />

          {images.length > 1 && (
            <button
              type="button"
              className="fullscreen-arrow fullscreen-right"
              onClick={nextImage}
              aria-label="Next image"
            >
              <ChevronRight size={30} />
            </button>
          )}

          <div className="fullscreen-counter">
            {activeImage + 1} / {images.length}
          </div>

        </div>
      )}

      {chatConversationId && (
        <div className="vehicle-chat-dock">
          <div className="vehicle-chat-dock-header">
            <strong>{sellerName || "Seller"}</strong>
            <button
              type="button"
              className="vehicle-chat-dock-close"
              onClick={closeChat}
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          <ChatWindow
            conversationId={chatConversationId}
            otherUserName={sellerName || "Seller"}
            connection={chatConnection}
            hideHeader
          />
        </div>
      )}

    </div>
  );
};