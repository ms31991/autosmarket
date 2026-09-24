import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";

export const LegalConsent = ({
  id,
  checked,
  onChange,
  children,
}) => (
  <label className="legal-consent" htmlFor={id}>
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span>{children}</span>
  </label>
);

export const AccountConsentText = () => {
  const { t } = useLanguage();
  return (
    <>
      {t("consentAccount")}{" "}
      <Link to="/terms">{t("termsFull")}</Link>
      {", "}
      <Link to="/privacy">{t("privacyFull")}</Link>
      {", "}
      <Link to="/cookies">{t("cookiesFull")}</Link>
    </>
  );
};

export const ListingConsentText = () => {
  const { t } = useLanguage();
  return (
    <>
      {t("consentListing")}{" "}
      <Link to="/terms">{t("termsFull")}</Link>
      {" & "}
      <Link to="/privacy">{t("privacyFull")}</Link>
      .
    </>
  );
};

export const PaymentConsentText = () => {
  const { t } = useLanguage();
  return (
    <>
      {t("consentPay")}{" "}
      <Link to="/refunds">{t("refunds")}</Link>
      {", "}
      <Link to="/terms">{t("terms")}</Link>
    </>
  );
};
