import { useEffect, useRef } from "react";
import { useCookieConsent } from "../consent/CookieConsentContext";
import { ADSENSE_CLIENT, adsenseReady } from "../config/site";

export function AdSenseSlot({ slot, className = "" }) {
  const { adsAllowed } = useCookieConsent();
  const pushed = useRef(false);

  const canShow = adsAllowed && adsenseReady() && Boolean(slot);

  useEffect(() => {
    if (!canShow || pushed.current) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      pushed.current = true;
    } catch {
      /* AdSense not loaded yet */
    }
  }, [canShow]);

  if (!canShow) return null;

  return (
    <ins
      key={slot}
      className={`adsbygoogle ${className}`.trim()}
      style={{ display: "block" }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
