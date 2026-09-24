import { Link } from 'react-router-dom'
import { FiArrowRight, FiSearch } from 'react-icons/fi'
import { useLanguage } from '../i18n/LanguageContext'
import { SITE_LOGO } from '../config/site'
import './Banner.css'

export const Banner = () => {
  const { t } = useLanguage()
  return (
    <section className="banner">

      <div className="banner-overlay"></div>

      <div className="banner-content">

        <Link to="/" className="banner-logo">
          <img src={SITE_LOGO} alt="AutoMarket" />
        </Link>

        <span className="banner-badge">
          {t("bannerBadge")}
        </span>

        <h1 className="banner-title">
          {t("bannerTitle1")} <span>{t("bannerTitle2")}</span>
        </h1>

        <p className="banner-subtitle">
          {t("bannerSub")}
        </p>

        <div className="banner-sell-quote">
          <span>{t("bannerSell")}</span> {t("bannerBuyer")}
        </div>

        <div className="banner-buttons">
          <Link to="/vehicles" className="banner-primary">
            <FiSearch />
            {t("explore")}
            <FiArrowRight />
          </Link>

          <Link to="/add-vehicle" className="banner-secondary">
            {t("sellVehicle")}
          </Link>
        </div>

      </div>

    </section>
  )
}
