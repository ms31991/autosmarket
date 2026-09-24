import { useState } from "react";
import { SignUp } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import {
  AccountConsentText,
  LegalConsent,
} from "../components/LegalConsent";
import { useAuthViewportLock } from "./useAuthViewportLock";
import { useLanguage } from "../i18n/LanguageContext";
import { CLERK_AUTH_APPEARANCE } from "./clerkAuthAppearance";
import { SITE_LOGO } from "../config/site";
import "./Register.css";

function isRegisterAction(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      ".cl-formButtonPrimary, .cl-socialButtonsBlockButton, button[type='submit']"
    )
  );
}

export function Register() {
  useAuthViewportLock();
  const [accepted, setAccepted] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const { t } = useLanguage();

  function requireConsent(event) {
    if (accepted) return;
    if (!isRegisterAction(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    setConsentError(true);
  }

  function handleAccepted(checked) {
    setAccepted(checked);
    if (checked) setConsentError(false);
  }

  return (
    <div className="register-page">
      <Link to="/" className="auth-brand" aria-label="AutoMarket home">
        <img src={SITE_LOGO} alt="AutoMarket" />
      </Link>
      <div
        className="auth-card"
        onClickCapture={requireConsent}
        onSubmitCapture={requireConsent}
      >
        <SignUp
          routing="virtual"
          signInUrl="/login"
          fallbackRedirectUrl="/"
          appearance={CLERK_AUTH_APPEARANCE}
        />
      </div>

      <div className="auth-legal-gate">
        <LegalConsent
          id="register-legal-consent"
          checked={accepted}
          onChange={handleAccepted}
        >
          <AccountConsentText />
        </LegalConsent>
        {consentError ? (
          <p className="auth-consent-error" role="alert">
            {t("tickToRegister")}
          </p>
        ) : null}
      </div>

      <div className="auth-banner">
        <span>{t("alreadyAccount")}</span>
        <Link to="/login">{t("navLogin")}</Link>
      </div>
    </div>
  );
}
