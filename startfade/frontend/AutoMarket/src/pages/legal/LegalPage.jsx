import { Link, Navigate, useParams } from "react-router-dom";
import { getLegalPages } from "../../legal/legalContent";
import { useLanguage } from "../../i18n/LanguageContext";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import "./LegalPage.css";

const SLUGS = {
  privacy: "privacy",
  terms: "terms",
  cookies: "cookies",
  refunds: "refunds",
  about: "about",
  contact: "contact",
  guidelines: "guidelines",
};

export const LegalPage = ({ page: pageProp }) => {
  const { t } = useLanguage();
  const settings = useSiteSettings();
  const { page: pageParam } = useParams();
  const key = pageProp || pageParam;
  const page = getLegalPages(settings)[key];

  if (!page || !SLUGS[key]) {
    return <Navigate to="/privacy" replace />;
  }

  return (
    <div className="legal-page">
      <article className="legal-article">
        <p className="legal-kicker">{t("legalKicker")}</p>
        <h1>{page.title}</h1>
        <p className="legal-updated">{t("lastUpdated", { date: page.updated })}</p>

        <nav className="legal-nav" aria-label={t("legalDocs")}>
          <Link to="/privacy">{t("privacy")}</Link>
          <Link to="/terms">{t("terms")}</Link>
          <Link to="/cookies">{t("cookies")}</Link>
          <Link to="/refunds">{t("refunds")}</Link>
          <Link to="/guidelines">{t("guidelines")}</Link>
          <Link to="/guides">{t("guides")}</Link>
          <Link to="/how-it-works">{t("howItWorks")}</Link>
          <Link to="/faq">{t("faq")}</Link>
          <Link to="/contact">{t("contact")}</Link>
        </nav>

        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 80)}>{paragraph}</p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
};
