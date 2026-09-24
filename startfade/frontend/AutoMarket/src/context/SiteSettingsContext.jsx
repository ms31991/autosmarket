import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../config/api";
import {
  LEGAL_ADDRESS,
  LEGAL_NAME,
  PRIVACY_EMAIL,
  SUPPORT_EMAIL,
} from "../config/site";

const fallback = {
  legalName: LEGAL_NAME,
  legalAddress: LEGAL_ADDRESS,
  supportEmail: SUPPORT_EMAIL,
  privacyEmail: PRIVACY_EMAIL,
};

const SiteSettingsContext = createContext({
  ...fallback,
  refresh: () => {},
});

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(fallback);

  async function load() {
    try {
      const response = await fetch(`${API_BASE}/SiteSettings`);
      if (!response.ok) return;
      const data = await response.json();
      setSettings({
        legalName: data.legalName || fallback.legalName,
        legalAddress: data.legalAddress || "",
        supportEmail: data.supportEmail || fallback.supportEmail,
        privacyEmail: data.privacyEmail || fallback.privacyEmail,
      });
    } catch {
      /* keep fallback */
    }
  }

  useEffect(() => {
    load();
  }, []);

  const value = useMemo(
    () => ({
      ...settings,
      refresh: load,
    }),
    [settings]
  );

  return (
    <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
