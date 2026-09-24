import { SignIn } from "@clerk/clerk-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuthViewportLock } from "./useAuthViewportLock";
import { useLanguage } from "../i18n/LanguageContext";
import { CLERK_AUTH_APPEARANCE } from "./clerkAuthAppearance";
import { SITE_LOGO } from "../config/site";
import "./Login.css";

export function Login() {
  useAuthViewportLock();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  const afterLogin =
    redirect && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : "/";

  return (
    <div className="auth-page">
      <Link to="/" className="auth-brand" aria-label="AutoMarket home">
        <img src={SITE_LOGO} alt="AutoMarket" />
      </Link>

      <div className="auth-card">
        <SignIn
          routing="virtual"
          withSignUp={false}
          transferable={false}
          signUpUrl="/register"
          fallbackRedirectUrl={afterLogin}
          appearance={CLERK_AUTH_APPEARANCE}
        />
      </div>

      <p className="auth-legal-links">
        <Link to="/privacy">{t("privacy")}</Link>
        {" · "}
        <Link to="/terms">{t("terms")}</Link>
        {" · "}
        <Link to="/cookies">{t("cookies")}</Link>
      </p>

      

    </div>
  );
}
