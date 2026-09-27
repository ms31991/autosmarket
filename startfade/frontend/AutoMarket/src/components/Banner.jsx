import { Link } from 'react-router-dom'
import { FiArrowRight, FiMessageCircle, FiSearch, FiTrendingUp, FiUpload } from 'react-icons/fi'
import { useLanguage } from '../i18n/LanguageContext'
import { SITE_LOGO } from '../config/site'
import './Banner.css'

export const Banner = () => {
  const { t } = useLanguage()
  const features = [
    { icon: FiUpload, title: t("bannerStory1Title"), text: t("bannerStory1") },
    { icon: FiMessageCircle, title: t("bannerStory2Title"), text: t("bannerStory2") },
    { icon: FiTrendingUp, title: t("bannerStory3Title"), text: t("bannerStory3") },
    { icon: FiSearch, title: t("bannerStory4Title"), text: t("bannerStory4") },
  ]

  return (
    <section className="banner">

      <div className="banner-overlay"></div>

      <div className="banner-inner">
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

        <aside className="banner-story" aria-label={t("bannerStoryKicker")}>
          <p className="banner-story-kicker">{t("bannerStoryKicker")}</p>
          <ul className="banner-story-steps">
            {features.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.title}>
                  <span className="banner-story-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="banner-chat" aria-hidden="true">
            <div className="banner-chat-bubble banner-chat-in">{t("bannerChatBuyer")}</div>
            <div className="banner-chat-bubble banner-chat-out">{t("bannerChatSeller")}</div>
          </div>
        </aside>
      </div>

    </section>
  )
}
