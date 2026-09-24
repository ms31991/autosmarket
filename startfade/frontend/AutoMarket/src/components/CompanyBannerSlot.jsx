import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import { mediaUrl } from "../utils/mediaUrl";
import "./CompanyBannerSlot.css";

function asList(banners) {
  if (Array.isArray(banners)) return banners.filter((item) => item?.imageUrl);
  if (banners?.imageUrl) return [banners];
  return [];
}

export function CompanyBannerSlot({ banners }) {
  const { t } = useLanguage();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const list = asList(banners);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [list.length]);

  useEffect(() => {
    if (list.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % list.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [list.length]);

  function goAdvertise() {
    if (isSignedIn) {
      navigate("/advertise/company-banner");
      return;
    }
    navigate("/login?redirect=/advertise/company-banner");
  }

  if (list.length) {
    return (
      <section className="company-banner-wrap" aria-label={t("bannerTitle")}>
        <div className="company-banner-frame company-banner-live">
          {list.map((banner, i) => {
            const href = banner.targetUrl || "#";
            const active = i === index;
            return (
              <a
                key={banner.id || `${banner.imageUrl}-${i}`}
                className={`company-banner-slide${active ? " is-active" : ""}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={active ? 0 : -1}
                aria-hidden={!active}
              >
                <img
                  src={mediaUrl(banner.imageUrl)}
                  alt={banner.companyName || t("bannerTitle")}
                />
              </a>
            );
          })}
        </div>
        <button type="button" className="company-banner-next" onClick={goAdvertise}>
          {t("bannerTitle")}
        </button>
      </section>
    );
  }

  return (
    <section className="company-banner-wrap" aria-label={t("bannerTitle")}>
      <button type="button" className="company-banner-frame company-banner-empty" onClick={goAdvertise}>
        <span className="company-banner-kicker">{t("bannerKicker")}</span>
        <strong>{t("bannerTitle")}</strong>
        <p>{t("bannerDesc")}</p>
        <span className="company-banner-cta">{t("bannerCta")}</span>
      </button>
    </section>
  );
}
