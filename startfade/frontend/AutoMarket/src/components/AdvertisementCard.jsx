import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { mediaUrl } from "../utils/mediaUrl";
import { API_BASE } from "../config/api";
import { PublisherChip, publisherFrom } from "./PublisherChip";
import "./AdvertisementCard.css";

const FALLBACK_LISTING_OFFERS = [
  {
    name: "Weekly",
    days: 7,
    price: 2.99,
    description: "Your listing stays on the homepage for 7 days.",
  },
  {
    name: "Monthly",
    days: 30,
    price: 5.99,
    description: "Your listing stays on the homepage for 30 days.",
    popular: true,
  },
  {
    name: "Yearly",
    days: 365,
    price: 49.99,
    description: "Your listing stays on the homepage for 365 days.",
  },
];

export const AdvertisementCard = ({ onPromote, compact = false }) => {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      className={`advertisement-card${compact ? " compact" : ""}`}
      onClick={onPromote}
    >
      <div className="advertisement-spot-icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" width={compact ? 40 : 52} height={compact ? 40 : 52}>
          <defs>
            <linearGradient id="advBeam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFC42D" stopOpacity="0.95" />
              <stop offset="1" stopColor="#FFC42D" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="32,3 51,42 13,42" fill="url(#advBeam)" />
          <ellipse cx="32" cy="49" rx="17" ry="4" fill="rgba(255,196,45,0.22)" />
          <path
            d="M19 47c0-2.2 1.8-4 4-4h18c2.2 0 4 1.8 4 4v1.5c0 1.1-.9 2-2 2H21c-1.1 0-2-.9-2-2V47z"
            fill="#F3F1EA"
          />
          <path
            d="M23 43l2.6-5.4c.9-1.9 2.8-3.1 4.9-3.1h3c2.1 0 4 1.2 4.9 3.1L41 43"
            fill="none"
            stroke="#F3F1EA"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="24" cy="50.5" r="2.1" fill="#12161B" />
          <circle cx="40" cy="50.5" r="2.1" fill="#12161B" />
        </svg>
      </div>

      <h3>{compact ? t("adPromote") : t("adTitle")}</h3>
      <p>{compact ? t("adPromoteHint") : t("adDesc")}</p>

      <span className="advertisement-promote">
        {compact ? t("adPromote") : t("adCta")}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
};

export const PromotedVehicleCard = ({ ad }) => {
  const vehicleId = ad?.vehicleId;
  const title =
    [ad?.brandName, ad?.modelName].filter(Boolean).join(" ") ||
    ad?.title ||
    "Listing";
  const image = mediaUrl(ad?.vehicleImageUrl || ad?.imageUrl);
  const href = vehicleId ? `/vehicles/${vehicleId}` : ad?.targetUrl || "/";
  const price = ad?.vehiclePrice ?? ad?.price;
  const fuel = ad?.fuelTypeName;
  const mileage =
    ad?.mileage != null && ad.mileage !== ""
      ? `${Number(ad.mileage).toLocaleString()} km`
      : null;
  const year = ad?.year;
  const publisher = publisherFrom(ad);
  const publisherName = publisher?.name || "User";
  const savePercent = Number(ad?.id) % 2 === 0 ? 20 : 30;

  const specs = [mileage, fuel, year].filter(Boolean).join(" · ");

  return (
    <article className="ad-deal-card">
      <Link to={href} className="ad-deal-media">
        {image ? (
          <img src={image} alt={title} />
        ) : (
          <span className="ad-deal-media-empty">No photo</span>
        )}
        <span className="ad-deal-ribbon">best deal</span>
      </Link>

      <div className="ad-deal-body">
        <Link to={href} className="ad-deal-title">
          {title}
        </Link>

        {specs ? <p className="ad-deal-specs">{specs}</p> : null}

        <div className="ad-deal-user">
          <PublisherChip
            variant="name"
            userId={publisher?.userId}
            name={publisherName}
            menuPlacement="top"
          />
        </div>

        <div className="ad-deal-footer">
          <span className="ad-deal-price">
            {price != null && price !== ""
              ? `€${Number(price).toLocaleString()}`
              : "—"}
          </span>
          <span className="ad-deal-save">{savePercent}% save</span>
        </div>
      </div>
    </article>
  );
};

export const AdvertisementOffers = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [offers, setOffers] = useState(FALLBACK_LISTING_OFFERS);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch(`${API_BASE}/AdPackages?kind=listing`)
      .then((response) => response.json())
      .then((rows) => {
        if (cancelled || !Array.isArray(rows) || !rows.length) return;
        setOffers(
          rows.map((item) => ({
            ...item,
            popular: item.name === "Monthly" || item.days === 30,
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  function chooseOffer(offer) {
    const params = new URLSearchParams({
      name: offer.name,
      days: String(offer.days),
      price: String(offer.price),
    });
    onClose?.();
    navigate(`/advertise/select-vehicle?${params.toString()}`);
  }

  return (
    <div className="ad-offers-overlay" onClick={onClose} role="presentation">
      <div
        className="ad-offers-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-offers-title"
      >
        <div className="ad-offers-header">
          <h2 id="ad-offers-title">{t("adChoose")}</h2>
          <button type="button" className="ad-offers-close" onClick={onClose}>
            {t("adClose")}
          </button>
        </div>
        <div className="ad-offers-grid">
          {offers.map((offer) => (
            <button
              key={offer.name}
              type="button"
              className={`ad-offer${offer.popular ? " ad-offer-popular" : ""}`}
              onClick={() => chooseOffer(offer)}
            >
              {offer.popular && (
                <span className="ad-offer-badge">{t("adPopular")}</span>
              )}
              <span>{t("adDays", { n: offer.days })}</span>
              <strong>
                {offer.name === "Weekly"
                  ? t("adWeekly")
                  : offer.name === "Monthly"
                    ? t("adMonthly")
                    : t("adYearly")}
              </strong>
              <em>
                €
                {offer.price.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </em>
              <p>
                {offer.name === "Weekly"
                  ? t("adWeeklyDesc")
                  : offer.name === "Monthly"
                    ? t("adMonthlyDesc")
                    : t("adYearlyDesc")}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};