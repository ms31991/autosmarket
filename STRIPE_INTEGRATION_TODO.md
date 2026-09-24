# Stripe Integration TODO

Single source of truth for remaining Checkout Form setup.

Auth, vehicle selection, Clerk email prefills, webhook route, and one-time `price_data` amounts were already in the project and were left in place.

## Values to Replace

The following values are placeholders and must be updated before going live.

**Files containing placeholders:**
- [startfade/frontend/AutoMarket/.env](startfade/frontend/AutoMarket/.env)
- [startfade/backend/.env](startfade/backend/.env)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | set in frontend `.env` | Restart Vite after any change. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_REPLACE_ME` | Signing secret from [Workbench webhooks](https://dashboard.stripe.com/workbench/webhooks) or `stripe listen`. |

`mode` and `line_items` already use real one-time values (`mode: "payment"` and `price_data` from the selected offer). They are not Stripe Price ID placeholders.

## Configured Parameters

These parameters were configured in Checkout Studio and are already set correctly.

**Files containing these parameters:**
- [startfade/backend/src/routes/payments.js](startfade/backend/src/routes/payments.js)

| Parameter | Value |
|-----------|-------|
| ui_mode | `form` |
| billing_address_collection | `auto` |
| submit_type | `pay` |
| integration_identifier | `custom_embedded_web_0001` |

`payment_method_collection` is not set because `mode` is `"payment"` (it applies only to `"subscription"`).

## Setup and next steps

### Environment variables

**Backend** (`startfade/backend/.env`):
- `STRIPE_SECRET_KEY` — already set (server-only, no `VITE_` prefix)
- `STRIPE_WEBHOOK_SECRET` — replace `whsec_REPLACE_ME`
- `FRONTEND_URL` — `http://localhost:5173`

**Frontend** (`startfade/frontend/AutoMarket/.env`):
- `VITE_STRIPE_PUBLISHABLE_KEY` — set your `pk_test_...` / `pk_live_...`

### API version

The Stripe server client uses:

`2026-08-26.dahlia; custom_checkout_payment_form_preview=v1`

Stripe.js is loaded from `https://js.stripe.com/dahlia/stripe.js` in `startfade/frontend/AutoMarket/index.html` (not bundled).

### Project structure (changed files)

- `startfade/backend/src/routes/payments.js` — Checkout Studio params, `client_secret` JSON
- `startfade/frontend/AutoMarket/index.html` — Dahlia Stripe.js
- `startfade/frontend/AutoMarket/src/pages/advertisment/SelectVehicle.jsx` — embedded form
- `startfade/frontend/AutoMarket/src/pages/advertisment/SelectVehicle.css` — form container
- `startfade/frontend/AutoMarket/.env` — `VITE_STRIPE_PUBLISHABLE_KEY`

No new server routes. Existing `/api/Payments/checkout` and `/api/Payments/webhook` are reused.

### How the integration works

1. User picks an offer, then a vehicle (existing flow).
2. Frontend `POST /api/Payments/checkout` with vehicle, amount, Clerk email.
3. Backend creates a Checkout Session (`ui_mode: form`) and returns `{ client_secret, url }`.
4. If Stripe returns `url`, the browser opens Checkout (same as Stripe’s sample). Otherwise the embedded form mounts.
5. Confirm runs `loadActions().actions.confirm`. On success the app goes to `/?paid=true`.
6. Webhook `checkout.session.completed` still marks a `Payments` row paid when `metadata.paymentId` exists.

### Testing

Use Stripe test mode cards, for example:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

Any future expiry, any CVC, any postal code. See [testing](https://docs.stripe.com/testing).

Restart the Node API after `payments.js` changes. Restart Vite after changing `VITE_STRIPE_PUBLISHABLE_KEY`.

### Next steps

- Put the real publishable key in the frontend `.env`.
- Finish webhook signing (`STRIPE_WEBHOOK_SECRET`) if you need paid status in the database.
- Optionally upgrade `stripe` to 21.0.0+ if you want the newer Checkout Form SDK APIs.
- Fulfillment: homepage ads after pay is not wired; extend the webhook if you need that.
- Do not put secret keys in frontend code.

### Resources

- https://support.stripe.com
- https://docs.stripe.com/mcp
- https://docs.stripe.com/checkout/embedded
