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

export const HowItWorksPage = () => {
  const { t } = useLanguage();
  useHashScroll();

  const columns = [
    {
      id: "buy",
      title: t("hiwBuyTitle"),
      steps: [t("hiwBuy1"), t("hiwBuy2"), t("hiwBuy3")],
      cta: t("hiwCtaBrowse"),
      to: "/vehicles",
    },
    {
      id: "sell",
      title: t("hiwSellTitle"),
      steps: [t("hiwSell1"), t("hiwSell2"), t("hiwSell3")],
      cta: t("hiwCtaSell"),
      to: "/add-vehicle",
    },
    {
      id: "promote",
      title: t("hiwPromoTitle"),
      steps: [t("hiwPromo1"), t("hiwPromo2"), t("hiwPromo3")],
      cta: t("hiwCtaPromo"),
      to: "/",
    },
  ];

  return (
    <div className="help-page how-it-works-page">
      <div className="help-inner help-wide">
        <p className="help-kicker">{t("hiwKicker")}</p>
        <h1>{t("howItWorks")}</h1>
        <p className="help-lead">{t("hiwLead")}</p>

        <div className="hiw-grid">
          {columns.map((column) => (
            <article className="hiw-card" key={column.id} id={column.id}>
              <h2>{column.title}</h2>
              <ol>
                {column.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <Link className="hiw-cta" to={column.to}>
                {column.cta}
              </Link>
            </article>
          ))}
        </div>

        <section className="hiw-tips" id="tips">
          <h2>{t("hiwTipsTitle")}</h2>
          <ul>
            <li>{t("hiwTip1")}</li>
            <li>{t("hiwTip2")}</li>
            <li>{t("hiwTip3")}</li>
          </ul>
        </section>

        <p className="help-more">
          <Link to="/guides">{t("guides")}</Link>
          {" · "}
          <Link to="/faq">{t("faq")}</Link>
          {" · "}
          <Link to="/guidelines">{t("guidelines")}</Link>
          {" · "}
          <Link to="/contact">{t("contact")}</Link>
        </p>
      </div>
    </div>
  );
};
