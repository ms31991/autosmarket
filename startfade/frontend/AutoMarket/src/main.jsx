import "./styles/tokens.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { CLERK_AUTH_APPEARANCE } from "./pages/clerkAuthAppearance";

import App from "./App";
import { ClerkTokenProvider } from "./context/ClerkTokenProvider";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import { CookieConsentProvider } from "./consent/CookieConsentContext";
import { SiteSettingsProvider } from "./context/SiteSettingsContext";
import { BrowserRouter } from "react-router-dom";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <LanguageProvider>
  <ClerkProvider
    publishableKey={PUBLISHABLE_KEY}
    telemetry={false}
    signInUrl="/login"
    signUpUrl="/register"
    appearance={CLERK_AUTH_APPEARANCE}
  >
    <BrowserRouter>
      <CookieConsentProvider>
      <ClerkTokenProvider>
        <AuthProvider>
          <SiteSettingsProvider>
          <App />
          </SiteSettingsProvider>
        </AuthProvider>
      </ClerkTokenProvider>
      </CookieConsentProvider>
    </BrowserRouter>
  </ClerkProvider>
  </LanguageProvider>
);