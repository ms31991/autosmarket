import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DICTS, LANGS, STORAGE_KEY } from "./translations";

const LanguageContext = createContext(null);

function interpolate(text, vars) {
  if (!vars) return text;
  return String(text).replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] == null ? "" : String(vars[key])
  );
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window === "undefined") return "en";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return LANGS.some((item) => item.code === stored) ? stored : "en";
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const value = useMemo(() => {
    const dict = DICTS[lang] || DICTS.en;
    const t = (key, vars) =>
      interpolate(dict[key] || DICTS.en[key] || key, vars);
    const setLang = (code) => {
      if (LANGS.some((item) => item.code === code)) {
        setLangState(code);
      }
    };
    return { lang, setLang, t };
  }, [lang]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}
