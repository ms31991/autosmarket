import { useState } from "react";
import { LANGS } from "../i18n/translations";
import { useLanguage } from "../i18n/LanguageContext";
import "./LanguageSwitcher.css";

export const LanguageSwitcher = ({ variant }) => {
  const { lang, setLang, t } = useLanguage();
  const current = LANGS.find((item) => item.code === lang) || LANGS[0];
  const others = LANGS.filter((item) => item.code !== lang);

  if (variant === "desktop") {
    return (
      <div className="lang-switcher lang-switcher-desktop">
        <select
          className="lang-switcher-select"
          value={lang}
          onChange={(event) => setLang(event.target.value)}
          aria-label={t("lang")}
        >
          {LANGS.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <MobileLanguageSwitcher
      current={current}
      others={others}
      setLang={setLang}
      closeLabel={t("closeLanguages")}
      langLabel={t("lang")}
    />
  );
};

function FlagImg({ src, alt }) {
  return <img src={src} alt={alt} className="lang-switcher-flag-img" />;
}

function MobileLanguageSwitcher({
  current,
  others,
  setLang,
  closeLabel,
  langLabel,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`lang-switcher-mobile${open ? " is-open" : ""}`}>
      {!open ? (
        <button
          type="button"
          className="lang-switcher-circle"
          aria-label={langLabel}
          onClick={() => setOpen(true)}
        >
          <FlagImg src={current.flag} alt="" />
        </button>
      ) : (
        <div className="lang-switcher-mobile-panel">
          {others.map((item) => (
            <button
              key={item.code}
              type="button"
              className="lang-switcher-circle"
              aria-label={item.name}
              onClick={() => {
                setLang(item.code);
                setOpen(false);
              }}
            >
              <FlagImg src={item.flag} alt="" />
            </button>
          ))}
          <button
            type="button"
            className="lang-switcher-close"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
