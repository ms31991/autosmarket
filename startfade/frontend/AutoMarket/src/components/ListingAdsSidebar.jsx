import { Link } from "react-router-dom";
import { AdSenseSlot } from "./AdSenseSlot";
import { useLanguage } from "../i18n/LanguageContext";
import { ADSENSE_SLOT_SIDEBAR } from "../config/site";
import "./ListingAdsSidebar.css";

export const ListingAdsSidebar = () => {
  const { t } = useLanguage();

  return (
    <aside className="vehicles-ads-sidebar">
      <div className="ad-placeholder">
        <span>{t("adsLabel")}</span>
        <div className="ad-box ad-box-live">
          <AdSenseSlot slot={ADSENSE_SLOT_SIDEBAR} />
        </div>
      </div>

      <Link className="ad-house" to="/how-it-works#promote">
        <span>{t("adsHouseKicker")}</span>
        <strong>{t("adsHouseTitle")}</strong>
        <p>{t("adsHouseText")}</p>
      </Link>
    </aside>
  );
};
