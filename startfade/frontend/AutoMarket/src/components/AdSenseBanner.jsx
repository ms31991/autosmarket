import { useLanguage } from "../i18n/LanguageContext";
import { AdSenseSlot } from "./AdSenseSlot";
import "./AdSenseBanner.css";

export function AdSenseBanner({ slot, className = "" }) {
  const { t } = useLanguage();
  if (!slot) return null;

  return (
    <div className={`adsense-banner ${className}`.trim()}>
      <span>{t("adsLabel")}</span>
      <div className="adsense-banner-box">
        <AdSenseSlot slot={slot} />
      </div>
    </div>
  );
}
