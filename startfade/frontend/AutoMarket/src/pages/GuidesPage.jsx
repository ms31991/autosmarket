import { Link, Navigate, useParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { getGuide, getGuides } from "../guides/guidesContent";
import "./HelpPages.css";

export const GuidesPage = () => {
  const { t, lang } = useLanguage();
  const { slug } = useParams();
  const guides = getGuides(lang);

  if (slug) {
    const guide = getGuide(lang, slug);
    if (!guide) return <Navigate to="/guides" replace />;
    return (
      <div className="help-page">
        <article className="help-inner">
          <p className="help-kicker">{t("guides")}</p>
          <h1>{guide.title}</h1>
          <p className="help-lead">{guide.summary}</p>
          {guide.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="guide-body">
              {paragraph}
            </p>
          ))}
          <p className="help-more">
            <Link to="/guides">{t("guidesAll")}</Link>
            {" · "}
            <Link to="/how-it-works">{t("howItWorks")}</Link>
            {" · "}
            <Link to="/guidelines">{t("guidelines")}</Link>
          </p>
        </article>
      </div>
    );
  }

  return (
    <div className="help-page">
      <div className="help-inner">
        <p className="help-kicker">{t("guidesKicker")}</p>
        <h1>{t("guides")}</h1>
        <p className="help-lead">{t("guidesLead")}</p>
        <div className="guide-list">
          {guides.map((guide) => (
            <Link className="guide-card" key={guide.slug} to={`/guides/${guide.slug}`}>
              <h2>{guide.title}</h2>
              <p>{guide.summary}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
