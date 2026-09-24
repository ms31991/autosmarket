import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { adsenseReady, ADSENSE_CLIENT } from "../config/site";
import "./CookieConsent.css";

const STORAGE_KEY = "autotrade_consent_v1";
const CookieConsentContext = createContext(null);

function defaultGtag() {
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };
}

function applyConsent(adsGranted) {
  if (typeof window === "undefined") return;
  defaultGtag();
  window.gtag("consent", "update", {
    ad_storage: adsGranted ? "granted" : "denied",
    ad_user_data: adsGranted ? "granted" : "denied",
    ad_personalization: adsGranted ? "granted" : "denied",
    analytics_storage: "denied",
  });
}

function loadAdSenseScript() {
  if (!adsenseReady()) return;
  if (document.getElementById("adsense-script")) return;
  const script = document.createElement("script");
  script.id = "adsense-script";
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.ads !== "boolean") return null;
    return { ads: parsed.ads };
  } catch {
    return null;
  }
}

export function CookieConsentProvider({ children }) {
  const { t } = useLanguage();
  const [choice, setChoice] = useState(null);
  const [bannerOpen, setBannerOpen] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setChoice(stored);
      applyConsent(stored.ads);
      if (stored.ads) loadAdSenseScript();
      return;
    }
    setBannerOpen(true);
    applyConsent(false);
  }, []);

  const save = useCallback((ads) => {
    const next = { ads: Boolean(ads) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setChoice(next);
    setBannerOpen(false);
    applyConsent(next.ads);
    if (next.ads) loadAdSenseScript();
  }, []);

  const openSettings = useCallback(() => {
    setBannerOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      adsAllowed: Boolean(choice?.ads),
      decided: Boolean(choice),
      openSettings,
    }),
    [choice, openSettings]
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {bannerOpen ? (
        <div className="cookie-banner" role="dialog" aria-labelledby="cookie-title">
          <div className="cookie-banner-inner">
            <h2 id="cookie-title">{t("cookieTitle")}</h2>
            <p>
              {t("cookieText")}{" "}
              <Link to="/cookies">{t("cookiesFull")}</Link>
            </p>
            <div className="cookie-actions">
              <button type="button" className="cookie-btn-primary" onClick={() => save(true)}>
                {t("cookieAccept")}
              </button>
              <button type="button" className="cookie-btn-ghost" onClick={() => save(false)}>
                {t("cookieReject")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    return { adsAllowed: false, decided: false, openSettings: () => {} };
  }
  return ctx;
}
