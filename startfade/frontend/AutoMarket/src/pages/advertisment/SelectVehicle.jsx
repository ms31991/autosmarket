import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { getClerkToken } from "../../services/clerkToken";
import { mediaUrl } from "../../utils/mediaUrl";
import {
  LegalConsent,
  PaymentConsentText,
} from "../../components/LegalConsent";
import { useLanguage } from "../../i18n/LanguageContext";
import { API_BASE } from "../../config/api";
import "./SelectVehicle.css";

function loadStripeJs() {
  if (typeof window.Stripe === "function") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-stripe-js]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Stripe.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.stripe.com/dahlia/stripe.js";
    script.async = true;
    script.dataset.stripeJs = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Stripe."));
    document.head.appendChild(script);
  });
}

const CHECKOUT_APPEARANCE = {
  theme: "stripe",
  labels: "auto",
  inputs: "spaced",
  variables: {
    borderRadius: "4px",
    colorBackground: "#ffffff",
    colorDanger: "#df1b41",
    colorPrimary: "#0570de",
    colorSuccess: "#00c853",
    colorText: "#30313d",
    fontFamily: "default",
    fontSizeBase: "16px",
    spacingUnit: "4px",
  },
};

export const SelectVehicle = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [payingId, setPayingId] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentConsent, setPaymentConsent] = useState(false);

  const offerName = searchParams.get("name") || "Offer";
  const offerDays = searchParams.get("days");
  const offerPrice = searchParams.get("price");

  useEffect(() => {
    async function load() {
      try {
        const token = await getClerkToken();
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await fetch(`${API_BASE}/Vehicles/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => []);
        if (!response.ok) {
          throw new Error(data.message || "Vehicles could not be loaded.");
        }
        setVehicles(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Vehicles could not be loaded.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [navigate]);

  useEffect(() => {
    if (!clientSecret) return;

    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey || publishableKey.includes("...")) {
      setError("Set VITE_STRIPE_PUBLISHABLE_KEY in the frontend .env.");
      return;
    }

    let cancelled = false;
    let form;

    async function mountForm() {
      try {
        await loadStripeJs();
        if (cancelled || typeof window.Stripe !== "function") return;

        const stripe = window.Stripe(publishableKey, {
          betas: ["custom_checkout_payment_form_1"],
        });
        const checkout = stripe.initCheckoutFormSdk({
          clientSecret,
          appearance: CHECKOUT_APPEARANCE,
        });
        form = checkout.createForm({ layout: "expanded" });
        form.mount("#checkout-form");

        const loadActionsResult = await checkout.loadActions();
        if (cancelled || loadActionsResult.type !== "success") return;

        form.on("confirm", async (event) => {
          try {
            await loadActionsResult.actions.confirm({ formConfirmEvent: event });
            window.location.href = "/?paid=true";
          } catch (err) {
            console.error("Payment confirmation error:", err);
          }
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load payment form.");
        }
      }
    }

    mountForm();

    return () => {
      cancelled = true;
      try {
        form?.unmount?.();
      } catch {
        /* ignore */
      }
    };
  }, [clientSecret]);

  async function payForVehicle(vehicleId) {
    if (payingId) return;
    if (!paymentConsent) {
      setError(t("payConsent"));
      return;
    }

    try {
      setPayingId(vehicleId);
      setError("");
      setClientSecret("");

      const token = await getClerkToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`${API_BASE}/Payments/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehicleId,
          amount: Number(offerPrice),
          days: Number(offerDays) || undefined,
          name: `${offerName} promotion`,
          currency: "eur",
          email: user?.primaryEmailAddress?.emailAddress || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Stripe checkout failed.");
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (!data.client_secret) {
        throw new Error("Stripe checkout failed.");
      }

      setClientSecret(data.client_secret);
    } catch (err) {
      setError(err.message || "Stripe checkout failed.");
      setPayingId(null);
    }
  }

  return (
    <div className="select-vehicle-page">
      <h1>{t("chooseVehicle")}</h1>
      <p>
        {offerName}
        {offerDays ? ` · ${offerDays} days` : ""}
        {offerPrice ? ` · €${offerPrice}` : ""}
      </p>

      {loading ? <p>{t("loading")}</p> : null}
      {error ? (
        <p className="select-vehicle-error" role="alert">
          {error}
        </p>
      ) : null}

      <LegalConsent
        id="payment-consent"
        checked={paymentConsent}
        onChange={setPaymentConsent}
      >
        <PaymentConsentText />
      </LegalConsent>

      {!loading && vehicles.length === 0 ? (
        <p>{t("noVehiclesYet")}</p>
      ) : (
        <div className="select-vehicle-grid">
          {vehicles.map((vehicle) => {
            const title =
              [vehicle.brandName || vehicle.brand, vehicle.modelName || vehicle.model]
                .filter(Boolean)
                .join(" ") || `Vehicle #${vehicle.id}`;
            const isPaying = Number(payingId) === Number(vehicle.id);
            const photo = mediaUrl(
              vehicle.images?.[0]?.imageUrl || vehicle.images?.[0]?.url || vehicle.images?.[0]
            );

            return (
              <button
                key={vehicle.id}
                type="button"
                className={`select-vehicle-item${isPaying ? " selected" : ""}`}
                disabled={Boolean(payingId) || !paymentConsent}
                onClick={() => payForVehicle(vehicle.id)}
              >
                <span className="select-vehicle-photo">
                  <img src={photo} alt={photo ? title : ""} />
                </span>
                <strong>{title}</strong>
                <span>
                  {[vehicle.year, vehicle.price != null ? `€${Number(vehicle.price).toLocaleString()}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span>{isPaying ? t("enterCard") : t("payStripe")}</span>
              </button>
            );
          })}
        </div>
      )}

      {clientSecret ? <div id="checkout-form" className="select-vehicle-checkout" /> : null}
    </div>
  );
};
