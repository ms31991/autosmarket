import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import "./HelpPages.css";

function useHashScroll() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
}

const FAQ_ITEMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const FaqPage = () => {
  const { t } = useLanguage();
  useHashScroll();

  return (
    <div className="help-page">
      <div className="help-inner">
        <p className="help-kicker">{t("faqKicker")}</p>
        <h1>{t("faq")}</h1>
        <p className="help-lead">{t("faqLead")}</p>

        <div className="faq-list">
          {FAQ_ITEMS.map((n) => (
            <details
              key={n}
              className="faq-item"
              id={n === 5 ? "price" : undefined}
              open={n === 5 && typeof window !== "undefined" && window.location.hash === "#price"}
            >
              <summary>{t(`faqQ${n}`)}</summary>
              <p>{t(`faqA${n}`)}</p>
            </details>
          ))}
        </div>

        <p className="help-more">
          <Link to="/how-it-works">{t("howItWorks")}</Link>
          {" · "}
          <Link to="/guides">{t("guides")}</Link>
          {" · "}
          <Link to="/contact">{t("contact")}</Link>
        </p>
      </div>
    </div>
  );
};
