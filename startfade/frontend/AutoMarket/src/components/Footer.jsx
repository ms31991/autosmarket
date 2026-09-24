import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { useCookieConsent } from "../consent/CookieConsentContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { SITE_LOGO } from "../config/site";
import "./Footer.css";

export const Footer = () => {
  const { t } = useLanguage();
  const { openSettings } = useCookieConsent();
  const { legalName, legalAddress } = useSiteSettings();
  const year = new Date().getFullYear();

  const footerColumns = [
    {
      title: t("buy"),
      links: [
        { label: t("cars"), to: "/vehicles-for-sale" },
        { label: t("suv"), to: "/vehicles?search=SUV" },
        { label: t("electric"), to: "/vehicles?search=Electric" },
        { label: t("newUsed"), to: "/vehicles" },
        { label: t("dealers"), to: "/vehicles" },
      ],
    },
    {
      title: t("sell"),
      links: [
        { label: t("createListing"), to: "/add-vehicle" },
        { label: t("promoteListing"), to: "/how-it-works#promote" },
        { label: t("sellingTips"), to: "/how-it-works#tips" },
        { label: t("buyingGuides"), to: "/guides" },
        { label: t("priceEval"), to: "/faq#price" },
      ],
    },
    {
      title: t("company"),
      links: [
        { label: t("aboutUs"), to: "/about" },
        { label: t("howItWorks"), to: "/how-it-works" },
        { label: t("faq"), to: "/faq" },
        { label: t("guides"), to: "/guides" },
        { label: t("contact"), to: "/contact" },
      ],
    },
    {
      title: t("legal"),
      links: [
        { label: t("privacy"), to: "/privacy" },
        { label: t("terms"), to: "/terms" },
        { label: t("cookies"), to: "/cookies" },
        { label: t("refunds"), to: "/refunds" },
      ],
    },
  ];

  const countries = [
    { code: "AL", label: t("albania"), to: "/vehicles?search=Albania" },
    { code: "KK", label: t("kosovo"), to: "/vehicles?search=Kosovo" },
    { code: "DE", label: t("germany"), to: "/vehicles?search=Germany" },
  ];

  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <Link to="/" className="footer-logo" aria-label="AutoMarket home">
            <img src={SITE_LOGO} alt="AutoMarket" />
          </Link>
          <p className="footer-tagline">{t("footerTagline")}</p>
        </div>

        {footerColumns.map((column) => (
          <div className="footer-column" key={column.title}>
            <h3 className="footer-column-title">{column.title}</h3>
            <ul className="footer-links">
              {column.links.map((link) => (
                <li key={link.to + link.label}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="footer-bottom">
        <p className="footer-copyright">
          &copy; {year} {legalName} — {t("footerRights")}
          {legalAddress ? ` · ${legalAddress}` : ""}
        </p>
        <button type="button" className="footer-cookies" onClick={openSettings}>
          {t("cookieSettings")}
        </button>
      </div>
    </footer>
  );
};
