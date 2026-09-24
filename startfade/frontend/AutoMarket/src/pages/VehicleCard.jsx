import "./VehicleCard.css";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { getClerkToken } from "../services/clerkToken";
import { PublisherChip } from "../components/PublisherChip";
import { mediaUrl, PLACEHOLDER_IMAGE } from "../utils/mediaUrl";
import { isPromotedVehicle } from "../utils/promotedSearch";
import { API_BASE } from "../config/api";

export const VehicleCard = ({
  vehicle,
  token,
  onView,
  onEdit,
  onDelete,
}) => {
  const { isSignedIn } = useUser();

  const [isFavourite, setIsFavourite] = useState(false);
  const [loadingFavourite, setLoadingFavourite] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const images = (vehicle?.images || [])
    .map((image) => mediaUrl(image))
    .filter(Boolean);

  const imageCount = images.length;
  const mainImage = images[activeImage] || PLACEHOLDER_IMAGE;
  const thumbs = images.slice(0, 4);
  const extraCount = Math.max(0, imageCount - 4);
  const promoted = isPromotedVehicle(vehicle);

  useEffect(() => {
    setActiveImage(0);
  }, [vehicle?.id]);

  useEffect(() => {
    const checkFavourite = async () => {
      if (!isSignedIn || !vehicle?.id) {
        setIsFavourite(false);
        return;
      }

      try {
        const currentToken = token || (await getClerkToken());
        if (!currentToken) {
          setIsFavourite(false);
          return;
        }

        const response = await fetch(
          `${API_BASE}/Favourites/check/${vehicle.id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          }
        );

        if (!response.ok) return;

        const data = await response.json();

        setIsFavourite(data.isFavourite === true);
      } catch (error) {
        console.error("CHECK FAVOURITE ERROR:", error);
      }
    };

    checkFavourite();
  }, [vehicle?.id, token, isSignedIn]);

  const handleFavourite = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSignedIn) {
      return;
    }

    const currentToken = await getClerkToken();

    if (!currentToken) {
      return;
    }

    if (loadingFavourite) {
      return;
    }

    setLoadingFavourite(true);

    try {
      const method = isFavourite
        ? "DELETE"
        : "POST";

      const response = await fetch(
        `${API_BASE}/Favourites/${vehicle.id}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      const text = await response.text();

      let data = {};

      try {
        data = text
          ? JSON.parse(text)
          : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        alert(
          data.message ||
            data.title ||
            "Ndodhi një gabim gjatë ruajtjes së veturës."
        );

        return;
      }

      setIsFavourite(!isFavourite);
    } catch (error) {
      console.error(
        "FAVOURITE ERROR:",
        error
      );

      alert(
        "Nuk mund të ndryshohej favourite."
      );
    } finally {
      setLoadingFavourite(false);
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `${window.location.origin}/vehicles/${vehicle.id}`;
    const title = [
      vehicle?.brandName || vehicle?.brand?.name,
      vehicle?.modelName || vehicle?.model?.name,
      vehicle?.year,
    ]
      .filter(Boolean)
      .join(" ");

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("SHARE ERROR:", error);
      }
    }
  };

  const brandName =
    vehicle?.brandName ||
    vehicle?.brand?.name ||
    "Unknown Brand";

  const modelName =
    vehicle?.modelName ||
    vehicle?.model?.name ||
    "";

  const year =
    vehicle?.year || "-";

  const cityName =
    vehicle?.cityName ||
    vehicle?.city?.name ||
    "";

  const countryName =
    vehicle?.countryName ||
    vehicle?.country?.name ||
    "";

  const locationLabel = [cityName, countryName]
    .filter((part) => part && part !== "-")
    .join(", ");

  const price =
    Number(vehicle?.price || 0).toLocaleString();

  const transmission =
    vehicle?.transmissionName ||
    vehicle?.transmission?.name ||
    "";

  const fuel =
    vehicle?.fuelTypeName ||
    vehicle?.fuelType?.name ||
    "";

  const mileage = vehicle?.mileage
    ? `${Number(vehicle.mileage).toLocaleString()} km`
    : "";

  const power = vehicle?.powerHP
    ? `${vehicle.powerHP} hp`
    : "";

  const publisherName = [
    vehicle?.ownerName,
    vehicle?.ownerSurname,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const publisherImage = vehicle?.ownerProfileImage
    ? mediaUrl(vehicle.ownerProfileImage)
    : "";

  const title = [brandName, modelName, year]
    .filter((part) => part && part !== "-")
    .join(" ");

  const specs = [
    year !== "-" && { key: "year", label: year, icon: "calendar" },
    mileage && { key: "mileage", label: mileage, icon: "speed" },
    fuel && { key: "fuel", label: fuel, icon: "fuel" },
    power && { key: "power", label: power, icon: "power" },
    transmission && { key: "transmission", label: transmission, icon: "gear" },
  ].filter(Boolean);

  return (
    <article className="vehicle-card">
      <Link
        to={`/vehicles/${vehicle.id}`}
        className="vehicle-card-link"
        onClick={() => {
          if (onView) {
            onView();
          }
        }}
      >
        <div className="vehicle-card-gallery">
          <div className="vehicle-card-main-photo">
            <img
              src={mainImage}
              alt={title}
              onError={(e) => {
                if (
                  e.currentTarget.src !==
                  PLACEHOLDER_IMAGE
                ) {
                  e.currentTarget.src =
                    PLACEHOLDER_IMAGE;
                }
              }}
            />

            {promoted ? (
              <span className="vehicle-card-ribbon">best deal</span>
            ) : null}

            {imageCount > 0 && (
              <span className="vehicle-card-counter">
                {activeImage + 1} / {imageCount}
              </span>
            )}
          </div>

          {thumbs.length > 1 && (
            <div className="vehicle-card-thumbs">
              {thumbs.map((src, index) => {
                const isLast = index === 3 && extraCount > 0;

                return (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    className={`vehicle-card-thumb${
                      activeImage === index ? " active" : ""
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveImage(index);
                    }}
                    aria-label={`Photo ${index + 1}`}
                  >
                    <img
                      src={src}
                      alt=""
                      onError={(e) => {
                        if (
                          e.currentTarget.src !==
                          PLACEHOLDER_IMAGE
                        ) {
                          e.currentTarget.src =
                            PLACEHOLDER_IMAGE;
                        }
                      }}
                    />
                    {isLast && (
                      <span className="vehicle-card-thumb-more">
                        +{extraCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="vehicle-card-content">
          <div className="vehicle-card-top">
            <div className="vehicle-card-heading">
              <h3 className="vehicle-card-title">{title}</h3>
              {transmission && (
                <p className="vehicle-card-subtitle">{transmission}</p>
              )}
            </div>

            <div className="vehicle-card-top-right">
              {(vehicle.ownerId || publisherName) && (
                <PublisherChip
                  userId={vehicle.ownerId || vehicle.userId}
                  name={publisherName || "User"}
                  image={publisherImage}
                  menuPlacement="top"
                />
              )}

              <div className="vehicle-card-actions">
                {isSignedIn && (
                  <button
                    type="button"
                    className={`vehicle-favourite${
                      isFavourite ? " active" : ""
                    }`}
                    onClick={handleFavourite}
                    disabled={loadingFavourite}
                    aria-label={
                      isFavourite
                        ? "Remove from favourites"
                        : "Add to favourites"
                    }
                  >
                    <svg viewBox="0 0 24 24" fill={isFavourite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 20s-7-4.4-9.5-8.2C.6 8.8 2.2 5 6 5c2 0 3.3 1.1 4 2.2C10.7 6.1 12 5 14 5c3.8 0 5.4 3.8 3.5 6.8C19 15.6 12 20 12 20z" />
                    </svg>
                  </button>
                )}

                <button
                  type="button"
                  className="vehicle-share"
                  onClick={handleShare}
                  aria-label="Share listing"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="2.4" />
                    <circle cx="6" cy="12" r="2.4" />
                    <circle cx="18" cy="19" r="2.4" />
                    <path d="m8.2 13.2 7.6 4.2M15.8 6.6l-7.6 4.2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="vehicle-card-price">
            €{price}
          </div>

          {specs.length > 0 && (
            <div className="vehicle-card-specs">
              {specs.map((spec) => (
                <span key={spec.key} className="vehicle-card-spec">
                  {spec.icon === "calendar" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="4" y="5" width="16" height="15" rx="2" />
                      <path d="M8 3v4M16 3v4M4 10h16" />
                    </svg>
                  )}
                  {spec.icon === "speed" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M5 19a9 9 0 1 1 14 0" />
                      <path d="m12 13 4-3" />
                      <circle cx="12" cy="13" r="1.2" fill="currentColor" stroke="none" />
                    </svg>
                  )}
                  {spec.icon === "fuel" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="4" y="3" width="11" height="18" rx="1.5" />
                      <path d="M15 7h3.5A1.5 1.5 0 0 1 20 8.5V16a2 2 0 1 1-2 0V11" />
                    </svg>
                  )}
                  {spec.icon === "power" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M13 3 5 14h7l-1 7 8-11h-7z" />
                    </svg>
                  )}
                  {spec.icon === "gear" && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                    </svg>
                  )}
                  {spec.label}
                </span>
              ))}
            </div>
          )}

          {locationLabel && (
            <div className="vehicle-card-location">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.2" />
              </svg>
              {locationLabel}
            </div>
          )}

          {(onEdit || onDelete) && (
            <div className="vehicle-card-owner-actions">
              {onEdit && (
                <button
                  type="button"
                  className="vehicle-card-edit"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(vehicle.id);
                  }}
                >
                  Edit
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  className="vehicle-card-delete"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(vehicle.id);
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
};
