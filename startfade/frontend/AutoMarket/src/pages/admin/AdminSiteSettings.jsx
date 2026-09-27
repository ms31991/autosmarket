import { useEffect, useState } from "react";
import "./AdminVehicles.css";
import { adminFetch, formatDate } from "./adminApi";
import { useSiteSettings } from "../../context/SiteSettingsContext";

export function AdminSiteSettings() {
  const { refresh } = useSiteSettings();
  const [form, setForm] = useState({
    legalName: "",
    legalAddress: "",
    supportEmail: "",
    privacyEmail: "",
    mailFrom: "",
  });
  const [updatedAt, setUpdatedAt] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setError("");
      const data = await adminFetch("/site-settings");
      setForm({
        legalName: data.legalName || "",
        legalAddress: data.legalAddress || "",
        supportEmail: data.supportEmail || "",
        privacyEmail: data.privacyEmail || "",
        mailFrom: data.mailFrom || "",
      });
      setUpdatedAt(data.updatedAt || "");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSaved("");
      const data = await adminFetch("/site-settings", {
        method: "PUT",
        body: form,
      });
      setForm({
        legalName: data.legalName || "",
        legalAddress: data.legalAddress || "",
        supportEmail: data.supportEmail || "",
        privacyEmail: data.privacyEmail || "",
        mailFrom: data.mailFrom || "",
      });
      setUpdatedAt(data.updatedAt || "");
      setSaved("Saved. Contact, Privacy, and outgoing notification emails use these values.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="admin-manage-page">
      <h1>Site settings</h1>
      <p>Legal name, address, contact emails, and the From address for message/expiry notifications. Change them here anytime.</p>
      {error ? <p className="admin-manage-error">{error}</p> : null}
      {saved ? <p>{saved}</p> : null}
      {updatedAt ? <p>Last updated: {formatDate(updatedAt)}</p> : null}

      <form onSubmit={save} style={{ maxWidth: 480, display: "grid", gap: 12 }}>
        <label>
          Legal name
          <input
            value={form.legalName}
            onChange={(e) => setField("legalName", e.target.value)}
            required
          />
        </label>
        <label>
          Address (optional)
          <input
            value={form.legalAddress}
            onChange={(e) => setField("legalAddress", e.target.value)}
          />
        </label>
        <label>
          Support email
          <input
            type="email"
            value={form.supportEmail}
            onChange={(e) => setField("supportEmail", e.target.value)}
            required
          />
        </label>
        <label>
          Privacy email
          <input
            type="email"
            value={form.privacyEmail}
            onChange={(e) => setField("privacyEmail", e.target.value)}
            required
          />
        </label>
        <label>
          Mail from (notifications)
          <input
            value={form.mailFrom}
            onChange={(e) => setField("mailFrom", e.target.value)}
            placeholder="AutoMarket <support@autosmarket.me>"
          />
        </label>
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          What users see as the sender of chat and expiry emails. Leave empty to use support email. Domain must be verified with Resend/SMTP.
        </p>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
