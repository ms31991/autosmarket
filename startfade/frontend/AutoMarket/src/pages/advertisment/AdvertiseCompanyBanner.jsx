import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getClerkToken } from "../../services/clerkToken";
import {
  LegalConsent,
  PaymentConsentText,
} from "../../components/LegalConsent";
import { useLanguage } from "../../i18n/LanguageContext";
import { API_BASE } from "../../config/api";
import { BannerImageCrop, BannerSlotPreview, cropBannerFile, defaultPlacement } from "./BannerImageCrop";
import "./SelectVehicle.css";
import "./AdvertiseCompanyBanner.css";

const FALLBACK_OFFERS = [
  { name: "Weekly", days: 7, price: 9.99, labelKey: "adWeekly" },
  { name: "Monthly", days: 30, price: 24.99, labelKey: "adMonthly", popular: true },
  { name: "Yearly", days: 365, price: 149.99, labelKey: "adYearly" },
];

function withBannerLabels(rows) {
  return rows.map((item) => ({
    ...item,
    labelKey:
      item.name === "Weekly" ? "adWeekly" : item.name === "Yearly" ? "adYearly" : "adMonthly",
    popular: item.name === "Monthly" || item.days === 30,
  }));
}

export const AdvertiseCompanyBanner = () => {
  const { user } = useUser();
  const { t } = useLanguage();
  const [companyName, setCompanyName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [localImage, setLocalImage] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [placement, setPlacement] = useState(defaultPlacement());
  const [previewImage, setPreviewImage] = useState(null);
  const imageElRef = useRef(null);
  const [offer, setOffer] = useState(FALLBACK_OFFERS[1]);
  const [offers, setOffers] = useState(FALLBACK_OFFERS);
  const [paymentConsent, setPaymentConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/AdPackages?kind=banner`)
      .then((response) => response.json())
      .then((rows) => {
        if (cancelled || !Array.isArray(rows) || !rows.length) return;
        const next = withBannerLabels(rows);
        setOffers(next);
        setOffer((current) => next.find((item) => item.days === current.days) || next[1] || next[0]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!localImage) {
      setPreviewImage(null);
      return undefined;
    }
    const next = new Image();
    next.onload = () => {
      imageElRef.current = next;
      setPreviewImage(next);
    };
    next.src = localImage;
    return () => {
      URL.revokeObjectURL(localImage);
    };
  }, [localImage]);

  function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setImageUrl("");
    imageElRef.current = null;
    setPreviewImage(null);
    setPlacement(defaultPlacement());
    setLocalImage((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setCropOpen(true);
  }

  async function uploadCroppedImage() {
    const src = localImage;
    if (!src) {
      if (imageUrl) return imageUrl;
      throw new Error(t("bannerNeedFields"));
    }
    const image = await new Promise((resolve, reject) => {
      if (imageElRef.current?.complete && imageElRef.current.naturalWidth) {
        resolve(imageElRef.current);
        return;
      }
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error(t("bannerUploadFail")));
      next.src = src;
    });
    imageElRef.current = image;
    setPreviewImage(image);
    const blob = await cropBannerFile(image, placement);
    const token = await getClerkToken();
    const form = new FormData();
    form.append("file", blob, "company-banner.jpg");
    const response = await fetch(`${API_BASE}/CompanyBanners/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || t("bannerUploadFail"));
    }
    setImageUrl(data.imageUrl);
    return data.imageUrl;
  }

  async function pay() {
    if (paying) return;
    if (!paymentConsent) {
      setError(t("payConsent"));
      return;
    }
    if (!companyName.trim() || !targetUrl.trim() || (!localImage && !imageUrl)) {
      setError(t("bannerNeedFields"));
      return;
    }

    try {
      setPaying(true);
      setUploading(true);
      setError("");
      const uploadedUrl = await uploadCroppedImage();
      const token = await getClerkToken();
      const response = await fetch(`${API_BASE}/Payments/banner-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName: companyName.trim(),
          targetUrl: targetUrl.trim(),
          imageUrl: uploadedUrl,
          amount: offer.price,
          days: offer.days,
          name: offer.name,
          currency: "eur",
          email: user?.primaryEmailAddress?.emailAddress || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || t("bannerPayFail"));
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(t("bannerPayFail"));
    } catch (err) {
      setError(err.message || t("bannerPayFail"));
      setPaying(false);
      setUploading(false);
    }
  }

  return (
    <div className="select-vehicle-page company-banner-page">
      <h1>{t("bannerPageTitle")}</h1>
      <p>{t("bannerPageLead")}</p>

      <div className="company-banner-form">
        <label>
          {t("bannerCompany")}
          <input
            type="text"
            maxLength={120}
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </label>
        <label>
          {t("bannerWebsite")}
          <input
            type="url"
            placeholder="https://"
            value={targetUrl}
            onChange={(event) => setTargetUrl(event.target.value)}
          />
        </label>
        <label className="company-banner-file">
          {t("bannerImage")}
          <span className="company-banner-file-box">
            <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={onFile} />
            <span className="company-banner-file-btn" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </span>
        </label>
        {localImage && cropOpen ? (
          <BannerImageCrop
            src={localImage}
            placement={placement}
            onPlacementChange={setPlacement}
            onConfirm={() => setCropOpen(false)}
            onCancel={() => {
              setCropOpen(false);
              setLocalImage((current) => {
                if (current) URL.revokeObjectURL(current);
                return "";
              });
              setPreviewImage(null);
              setImageUrl("");
            }}
            title={t("bannerCropTitle")}
            hint={t("bannerCropHint")}
            fitLabel={t("bannerFitPage")}
            fillLabel={t("bannerFillPage")}
            zoomLabel={t("bannerZoom")}
            confirmLabel={t("bannerCropConfirm")}
            cancelLabel={t("bannerCropCancel")}
          />
        ) : null}
        {localImage && !cropOpen ? (
          <button type="button" className="company-banner-mini" onClick={() => setCropOpen(true)}>
            <BannerSlotPreview src={localImage} placement={placement} image={previewImage} />
          </button>
        ) : null}

        <div className="company-banner-offers">
          {offers.map((item) => (
            <button
              key={item.name}
              type="button"
              className={`company-banner-offer${offer.name === item.name ? " selected" : ""}`}
              onClick={() => setOffer(item)}
            >
              <strong>{t(item.labelKey)}</strong>
              <span>€{item.price.toFixed(2)}</span>
              {item.popular ? <em>{t("adPopular")}</em> : null}
            </button>
          ))}
        </div>

        <LegalConsent
          id="banner-pay-consent"
          checked={paymentConsent}
          onChange={setPaymentConsent}
        >
          <PaymentConsentText />
        </LegalConsent>

        {error ? <p className="select-vehicle-error">{error}</p> : null}

        <button
          type="button"
          className="company-banner-pay"
          onClick={pay}
          disabled={paying || uploading}
        >
          {paying ? t("loading") : t("payStripe")}
        </button>
      </div>
    </div>
  );
};
