import { Router } from "express";
import Stripe from "stripe";
import { query, queryOne } from "../db.js";
import { camel, pick } from "../camel.js";
import { requireAuth, requireAdmin } from "../auth.js";
import { keysFromAuth, userMatchSql } from "../identity.js";
import { fulfillPaidPromotion, parseOfferDays } from "./commerce.js";
import { fulfillPaidCompanyBanner } from "./companyBanners.js";
import { findAdPackage } from "./adPackages.js";

const CHECKOUT_STUDIO = {
  billing_address_collection: "auto",
  submit_type: "pay",
  payment_method_types: ["card"],
};

let stripeClient = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes("REPLACE")) {
    return null;
  }
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

function mapPayment(row) {
  return camel(row);
}

async function completePayment(payment, transactionId) {
  await query(
    `UPDATE Payments SET Status = 2, PaidAt = SYSUTCDATETIME(), TransactionId = @transactionId
     WHERE Id = @id`,
    { id: payment.Id, transactionId }
  );
  if (payment.PurchaseAdvertisementId) {
    await query(
      `UPDATE PurchaseAdvertisements SET Status = 2, PaidAt = SYSUTCDATETIME() WHERE Id = @id`,
      { id: payment.PurchaseAdvertisementId }
    );
    const purchase = await queryOne(
      `SELECT * FROM PurchaseAdvertisements WHERE Id = @id`,
      { id: payment.PurchaseAdvertisementId }
    );
    if (purchase) {
      await fulfillPaidPromotion({
        userId: payment.UserId,
        vehicleId: purchase.VehicleId,
        packageId: purchase.AdvertisementPackageId,
        amount: purchase.Amount,
        days: null,
        offerName: "Promotion",
      });
    }
  }
}

async function applyCompanyBannerPayment(meta, sessionId) {
  if (meta.kind !== "company-banner" || !meta.userId) return false;
  const created = await fulfillPaidCompanyBanner({
    userId: meta.userId,
    companyName: meta.companyName,
    imageUrl: meta.imageUrl,
    targetUrl: meta.targetUrl,
    days: meta.days,
    amount: meta.amount,
    offerName: meta.offer,
    sessionId,
    format: meta.format,
  });
  if (created?.error) {
    console.error("fulfillPaidCompanyBanner:", created.error);
    return true;
  }
  try {
    await query(
      `INSERT INTO Payments
        (UserId, Amount, Currency, Method, Status, TransactionId, PaidAt, CreatedAt)
       VALUES (@userId, @amount, @currency, 1, 2, @sessionId, SYSUTCDATETIME(), SYSUTCDATETIME())`,
      {
        userId: meta.userId,
        amount: Number(meta.amount) || 0,
        currency: "eur",
        sessionId,
      }
    );
  } catch (err) {
    console.error("Could not record company banner payment row:", err.message);
  }
  return true;
}

async function applyPaidCheckoutSession(session) {
  if (!session || session.payment_status === "unpaid") return;
  const meta = session.metadata || {};
  const sessionId = session.id;
  const intentId = session.payment_intent ? String(session.payment_intent) : sessionId;
  const already = await queryOne(
    `SELECT TOP 1 * FROM Payments
     WHERE TransactionId = @sessionId OR TransactionId = @intentId`,
    { sessionId, intentId }
  );
  if (already?.Status === 2) {
    if (meta.kind === "company-banner") {
      await fulfillPaidCompanyBanner({
        userId: meta.userId,
        companyName: meta.companyName,
        imageUrl: meta.imageUrl,
        targetUrl: meta.targetUrl,
        days: meta.days,
        amount: meta.amount,
        offerName: meta.offer,
        sessionId,
        format: meta.format,
      });
      return;
    }
    if (meta.vehicleId && meta.userId) {
      await fulfillPaidPromotion({
        userId: meta.userId,
        vehicleId: meta.vehicleId,
        days: meta.days,
        amount: meta.amount,
        offerName: meta.offer,
        packageId: meta.packageId,
        extend: false,
      });
    }
    return;
  }

  const paymentId = Number(meta.paymentId);
  if (paymentId) {
    const payment = await queryOne(`SELECT * FROM Payments WHERE Id = @id`, {
      id: paymentId,
    });
    if (payment && payment.Status !== 2) {
      await completePayment(payment, intentId || sessionId);
    }
    return;
  }

  if (await applyCompanyBannerPayment(meta, sessionId)) {
    return;
  }

  if (meta.vehicleId && meta.userId) {
    const created = await fulfillPaidPromotion({
      userId: meta.userId,
      vehicleId: meta.vehicleId,
      days: meta.days,
      amount: meta.amount,
      offerName: meta.offer,
      packageId: meta.packageId,
      extend: true,
    });
    if (created?.error) {
      console.error("fulfillPaidPromotion:", created.error);
    } else {
      try {
        await query(
          `INSERT INTO Payments
            (UserId, Amount, Currency, Method, Status, TransactionId, PaidAt, CreatedAt)
           VALUES (@userId, @amount, @currency, 1, 2, @sessionId, SYSUTCDATETIME(), SYSUTCDATETIME())`,
          {
            userId: meta.userId,
            amount: Number(meta.amount) || 0,
            currency: "eur",
            sessionId,
          }
        );
      } catch (err) {
        console.error("Could not record promotion payment row:", err.message);
      }
    }
  }
}

export function paymentsRouter() {
  const router = Router();

  router.post("/webhook", async (req, res) => {
    if (!getStripe()) return res.status(400).send("Stripe not configured");
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = getStripe().webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch {
      return res.status(400).send("Webhook error");
    }
    if (event.type === "checkout.session.completed") {
      await applyPaidCheckoutSession(event.data.object);
    }
    res.json({ received: true });
  });

  router.post("/verify-session", async (req, res) => {
    if (!getStripe()) {
      return res.status(400).json({ message: "Stripe not configured." });
    }
    const sessionId = pick(req.body, "SessionId") || pick(req.body, "sessionId");
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required." });
    }
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid" && session.status !== "complete") {
        return res.status(400).json({ message: "Payment is not complete." });
      }
      await applyPaidCheckoutSession(session);
      res.json({ ok: true });
    } catch (err) {
      console.error("Stripe verify-session error:", err);
      res.status(400).json({
        message: err.message || "Could not verify payment.",
      });
    }
  });

  router.use(requireAuth);

  router.post("/checkout", async (req, res) => {
    try {
      if (!getStripe()) {
        return res.status(400).json({ message: "Stripe not configured." });
      }

      const vehicleId = pick(req.body, "VehicleId");
      const name = String(pick(req.body, "Name") || "Promotion");
      const currency = String(pick(req.body, "Currency") || "eur").toLowerCase();
      const days = parseOfferDays(name, pick(req.body, "Days"));
      const pack = await findAdPackage("listing", days, name);
      const amount = pack ? Number(pack.price) : 0;

      if (!vehicleId || !pack || !amount || amount <= 0) {
        return res.status(400).json({ message: "Vehicle and a valid package are required." });
      }

      const keys = keysFromAuth(req.user);
      const vehicle = await queryOne(
        `SELECT Id FROM Vehicles
         WHERE Id = @id AND ${userMatchSql("OwnerId", "ownerId", "clerkUserId")}`,
        {
          id: vehicleId,
          ownerId: keys.id,
          clerkUserId: keys.clerkUserId || keys.id,
        }
      );
      if (!vehicle) {
        return res.status(400).json({ message: "Vehicle not found or not owned." });
      }

      const email = String(
        pick(req.body, "Email") || req.authPayload?.email || req.authPayload?.email_address || ""
      )
        .trim()
        .toLowerCase();

      const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
      const session = await getStripe().checkout.sessions.create({
        ...CHECKOUT_STUDIO,
        mode: "payment",
        ...(email.includes("@") ? { customer_email: email } : {}),
        success_url: `${frontend}/?paid=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontend}/advertise/select-vehicle?canceled=true`,
        metadata: {
          userId: String(req.user.id),
          vehicleId: String(vehicleId),
          offer: name,
          days: String(days),
          amount: String(amount),
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: Math.round(amount * 100),
              product_data: { name },
            },
          },
        ],
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error("Stripe checkout error:", err);
      res.status(400).json({
        message: err?.raw?.message || err.message || "Stripe checkout failed.",
      });
    }
  });

  router.post("/banner-checkout", async (req, res) => {
    try {
      if (!getStripe()) {
        return res.status(400).json({ message: "Stripe not configured." });
      }

      const name = String(pick(req.body, "Name") || "Company banner");
      const currency = String(pick(req.body, "Currency") || "eur").toLowerCase();
      const companyName = String(pick(req.body, "CompanyName") || "").trim();
      const imageUrl = String(pick(req.body, "ImageUrl") || "").trim();
      const targetUrl = String(pick(req.body, "TargetUrl") || "").trim();
      const format = String(pick(req.body, "Format") || "wide").toLowerCase() === "large"
        ? "large"
        : "wide";
      const days = parseOfferDays(name, pick(req.body, "Days"));
      const offer = await findAdPackage("banner", days, name);
      const charge = offer ? Number(offer.price) : 0;
      if (!offer || !charge || charge <= 0) {
        return res.status(400).json({ message: "Invalid company banner offer." });
      }
      if (!imageUrl.startsWith("/uploads/banners/")) {
        return res.status(400).json({ message: "Upload a banner image first." });
      }
      if (!companyName || !targetUrl) {
        return res.status(400).json({
          message: "Company name, banner image, website and amount are required.",
        });
      }

      const email = String(
        pick(req.body, "Email") || req.authPayload?.email || req.authPayload?.email_address || ""
      )
        .trim()
        .toLowerCase();

      const frontend = process.env.FRONTEND_URL || "http://localhost:5173";
      const session = await getStripe().checkout.sessions.create({
        ...CHECKOUT_STUDIO,
        mode: "payment",
        ...(email.includes("@") ? { customer_email: email } : {}),
        success_url: `${frontend}/?paid=banner&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontend}/advertise/company-banner?canceled=true`,
        metadata: {
          kind: "company-banner",
          userId: String(req.user.id),
          companyName: companyName.slice(0, 120),
          imageUrl: imageUrl.slice(0, 500),
          targetUrl: targetUrl.slice(0, 500),
          offer: name,
          days: String(days),
          amount: String(charge),
          format,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: Math.round(charge * 100),
              product_data: { name: `${name} company banner` },
            },
          },
        ],
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error("Stripe banner checkout error:", err);
      res.status(400).json({
        message: err?.raw?.message || err.message || "Stripe checkout failed.",
      });
    }
  });

  router.post("/", async (req, res) => {
    const purchaseId = pick(req.body, "PurchaseAdvertisementId");
    const purchase = await queryOne(
      `SELECT * FROM PurchaseAdvertisements WHERE Id = @id AND UserId = @userId`,
      { id: purchaseId, userId: req.user.id }
    );
    if (!purchase) return res.status(404).json({ message: "Purchase advertisement not found." });
    if (purchase.Status !== 1) {
      return res.status(400).json({ message: "This purchase cannot be paid." });
    }
    const existing = await queryOne(
      `SELECT * FROM Payments WHERE PurchaseAdvertisementId = @id AND UserId = @userId AND Status = 1`,
      { id: purchase.Id, userId: req.user.id }
    );
    if (existing) return res.json(mapPayment(existing));
    const result = await query(
      `INSERT INTO Payments
        (UserId, PurchaseAdvertisementId, Amount, Currency, Method, Status, CreatedAt)
       OUTPUT INSERTED.*
       VALUES (@userId, @purchaseId, @amount, @currency, @method, 1, SYSUTCDATETIME())`,
      {
        userId: req.user.id,
        purchaseId: purchase.Id,
        amount: purchase.Amount,
        currency: purchase.Currency,
        method: pick(req.body, "Method") || 1,
      }
    );
    res.json(mapPayment(result[0]));
  });

  router.post("/create-checkout-session", async (req, res) => {
    if (!getStripe()) return res.status(400).json({ message: "Stripe not configured." });
    const paymentId = pick(req.body, "PaymentId");
    const purchaseId = pick(req.body, "PurchaseAdvertisementId");
    const payment = await queryOne(
      `SELECT * FROM Payments WHERE Id = @id AND UserId = @userId`,
      { id: paymentId, userId: req.user.id }
    );
    const purchase = await queryOne(
      `SELECT * FROM PurchaseAdvertisements WHERE Id = @id AND UserId = @userId`,
      { id: purchaseId, userId: req.user.id }
    );
    if (!payment || !purchase) return res.status(404).json({ message: "Not found." });
    const session = await getStripe().checkout.sessions.create({
      ...CHECKOUT_STUDIO,
      mode: "payment",
      metadata: {
        paymentId: String(payment.Id),
        purchaseId: String(purchase.Id),
        userId: req.user.id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: String(purchase.Currency || "eur").toLowerCase(),
            unit_amount: Math.round(Number(purchase.Amount) * 100),
            product_data: { name: "AutoMarket payment" },
          },
        },
      ],
    });
    await query(`UPDATE Payments SET TransactionId = @sessionId WHERE Id = @id`, {
      sessionId: session.id,
      id: payment.Id,
    });
    res.json({
      sessionId: session.id,
      client_secret: session.client_secret,
      url: session.url,
    });
  });

  router.post("/:id/verify-stripe", async (req, res) => {
    if (!getStripe()) return res.status(400).json({ message: "Stripe not configured." });
    const sessionId = pick(req.body, "SessionId");
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const payment = await queryOne(
      `SELECT * FROM Payments WHERE Id = @id AND UserId = @userId`,
      { id: Number(req.params.id), userId: req.user.id }
    );
    if (!payment) return res.status(404).json({ message: "Not found." });
    await applyPaidCheckoutSession(session);
    const updated = await queryOne(`SELECT * FROM Payments WHERE Id = @id`, {
      id: payment.Id,
    });
    res.json(mapPayment(updated));
  });

  router.get("/my", async (req, res) => {
    const rows = await query(
      `SELECT * FROM Payments WHERE UserId = @id ORDER BY CreatedAt DESC`,
      { id: req.user.id }
    );
    res.json(rows.map(mapPayment));
  });

  router.get("/:id", async (req, res) => {
    const row = await queryOne(
      `SELECT * FROM Payments WHERE Id = @id AND UserId = @userId`,
      { id: Number(req.params.id), userId: req.user.id }
    );
    if (!row) return res.status(404).json({ message: "Not found." });
    res.json(mapPayment(row));
  });

  router.post("/:id/confirm", requireAdmin, async (req, res) => {
    const payment = await queryOne(
      `SELECT * FROM Payments WHERE Id = @id AND UserId = @userId`,
      { id: Number(req.params.id), userId: req.user.id }
    );
    if (!payment) return res.status(404).json({ message: "Not found." });
    await completePayment(payment, `TEST-${Date.now()}`);
    const updated = await queryOne(`SELECT * FROM Payments WHERE Id = @id`, {
      id: payment.Id,
    });
    res.json(mapPayment(updated));
  });

  return router;
}
