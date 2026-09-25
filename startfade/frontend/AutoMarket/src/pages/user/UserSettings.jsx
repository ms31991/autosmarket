import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
  useClerk,
  useUser,
} from "@clerk/clerk-react";
import {
  FiArrowLeft,
  FiChevronRight,
  FiFileText,
  FiLock,
  FiLogOut,
  FiMail,
  FiShield,
  FiStar,
  FiTrash2,
  FiTruck,
  FiUser,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../i18n/LanguageContext";
import { getClerkToken } from "../../services/clerkToken";
import {
  deleteProfileImage,
  updateProfile,
  uploadProfileImage,
} from "../../services/userService";
import { mediaUrl } from "../../utils/mediaUrl";
import { compressImageFile } from "../../utils/compressImage";
import { API_BASE } from "../../config/api";
import "./UserSettings.css";

const PUBLIC_LEGAL = {
  privacy: "/privacy",
  terms: "/terms",
  cookies: "/cookies",
  about: "/about",
  contact: "/contact",
  guidelines: "/guidelines",
};

const MENU = [
  { id: "edit-profile", labelKey: "editProfile", hint: "Name, phone, photo", icon: FiUser },
  { id: "my-vehicles", label: "My Vehicles", hint: "View and manage your listings", icon: FiTruck },
  { id: "my-advertisements", labelKey: "myAds", hintKey: "myAdsHint", icon: FiStar },
  { id: "password", labelKey: "changePassword", hint: "Update your sign-in password", icon: FiLock },
  { id: "privacy", label: "Privacy Policy", hint: "How we use your data", icon: FiShield },
  { id: "terms", label: "Terms of Service", hint: "Rules for using AutoMarket", icon: FiFileText },
  { id: "cookies", label: "Cookie Policy", hint: "Cookies and similar storage", icon: FiFileText },
  { id: "guidelines", label: "Community Guidelines", hint: "What is allowed on the platform", icon: FiFileText },
  { id: "about", label: "About", hint: "What AutoMarket is", icon: FiFileText },
  { id: "contact", label: "Contact", hint: "Support and privacy email", icon: FiMail },
];

export const UserSettingsPage = () => {
  const { section } = useParams();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { dbUser, refreshDbUser } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [myAds, setMyAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);

  useEffect(() => {
    setName(dbUser?.name || user?.firstName || "");
    setSurname(dbUser?.surname || user?.lastName || "");
    const stored = String(dbUser?.userName || "").trim();
    const fake =
      /^user_/i.test(stored) || stored.toLowerCase().includes("@users.autosmarket.me");
    setUserName(
      (!fake && stored) ||
        user?.username ||
        String(user?.primaryEmailAddress?.emailAddress || "").split("@")[0] ||
        ""
    );
    setPhone(dbUser?.phoneNumber || "");
    setPhotoPreview(mediaUrl(dbUser?.profileImage || user?.imageUrl));
    setStatus("");
  }, [dbUser, user, section]);

  useEffect(() => {
    if (section !== "my-advertisements") return;
    let cancelled = false;

    async function loadAds() {
      setAdsLoading(true);
      try {
        const token = await getClerkToken();
        if (!token) {
          navigate("/login");
          return;
        }
        const response = await fetch(`${API_BASE}/Advertisements/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = response.ok ? await response.json().catch(() => []) : [];
        if (!cancelled) setMyAds(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setMyAds([]);
      } finally {
        if (!cancelled) setAdsLoading(false);
      }
    }

    loadAds();
    return () => {
      cancelled = true;
    };
  }, [section, navigate]);

  const openSection = (id) => navigate(`/settings/${id}`);

  const handleLogout = async () => {
    await signOut({ redirectUrl: "/" });
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      await updateProfile({
        name: name.trim(),
        surname: surname.trim(),
        userName: userName.trim().replace(/^@/, ""),
        phoneNumber: phone.trim(),
      });
      if (user) {
        try {
          await user.update({
            firstName: name.trim(),
            lastName: surname.trim(),
          });
        } catch {
          /* Clerk profile may be provider-managed */
        }
      }
      await refreshDbUser();
      setStatus("Profile updated.");
    } catch (err) {
      setStatus(err.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setStatus("");
    try {
      const ready = await compressImageFile(file);
      const result = await uploadProfileImage(ready);
      setPhotoPreview(mediaUrl(result.profileImage));
      await refreshDbUser();
      setStatus("Photo updated.");
    } catch (err) {
      setStatus(err.message || "Could not upload photo.");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    setSaving(true);
    setStatus("");
    try {
      await deleteProfileImage();
      setPhotoPreview(user?.imageUrl || "");
      await refreshDbUser();
      setStatus("Photo removed.");
    } catch (err) {
      setStatus(err.message || "Could not remove photo.");
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus("New passwords do not match.");
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      await user.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: true,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus("Password updated.");
    } catch (err) {
      setStatus(
        err.errors?.[0]?.longMessage ||
          err.message ||
          "Could not change password. If you signed in with Google or another provider, set a password from that account instead."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Delete your AutoMarket account permanently? This cannot be undone."
    );
    if (!confirmed) return;
    try {
      await user.delete();
      navigate("/");
    } catch (err) {
      setStatus(err.message || "Could not delete account.");
    }
  };

  if (PUBLIC_LEGAL[section]) {
    return <Navigate to={PUBLIC_LEGAL[section]} replace />;
  }

  return (
    <div className="ig-settings">
      <header className="ig-settings-top">
        <button
          type="button"
          className="ig-settings-back"
          onClick={() =>
            section ? navigate("/settings") : navigate("/userprofile")
          }
          aria-label="Back"
        >
          <FiArrowLeft />
        </button>
        <h1>
          {section === "edit-profile"
            ? t("editProfile")
            : section === "password"
              ? t("changePassword")
              : section === "my-advertisements"
                ? t("myAds")
                : t("settings")}
        </h1>
      </header>

      {!section && (
        <>
          <nav className="ig-settings-list">
            {MENU.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="ig-settings-row"
                  onClick={() =>
                    item.id === "my-vehicles"
                      ? navigate("/my-vehicles")
                      : PUBLIC_LEGAL[item.id]
                        ? navigate(PUBLIC_LEGAL[item.id])
                        : openSection(item.id)
                  }
                >
                  <Icon />
                  <span>
                    <strong>{item.labelKey ? t(item.labelKey) : item.label}</strong>
                    <em>{item.hintKey ? t(item.hintKey) : item.hint}</em>
                  </span>
                  <FiChevronRight />
                </button>
              );
            })}
          </nav>

          <div className="ig-settings-list danger-block">
            <button
              type="button"
              className="ig-settings-row"
              onClick={handleLogout}
            >
              <FiLogOut />
              <span>
                <strong>Log out</strong>
                <em>Sign out of this device</em>
              </span>
              <FiChevronRight />
            </button>
            <button
              type="button"
              className="ig-settings-row danger"
              onClick={handleDeleteAccount}
            >
              <FiTrash2 />
              <span>
                <strong>Delete account</strong>
                <em>Permanently remove your account</em>
              </span>
              <FiChevronRight />
            </button>
          </div>
        </>
      )}

      {section === "edit-profile" && (
        <form className="ig-settings-form" onSubmit={handleSaveProfile}>
          <label className="ig-photo-field">
            <img src={photoPreview} alt={photoPreview ? "Profile photo preview" : ""} />
            <span>Change photo</span>
            <input type="file" accept="image/*" onChange={handlePhoto} />
          </label>
          <button
            type="button"
            className="ig-text-btn"
            onClick={handleRemovePhoto}
            disabled={saving}
          >
            Remove photo
          </button>

          <label>
            First name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Last name
            <input
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              required
            />
          </label>
          <label>
            Username
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value.replace(/\s/g, ""))}
              minLength={3}
              maxLength={30}
              required
              autoComplete="username"
            />
          </label>
          <p className="ig-settings-note">
            Username is shown on your profile. Use 3–30 letters, numbers, dots or underscores.
          </p>
          <label>
            Phone (optional)
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </label>
          <p className="ig-settings-note">
            Phone is optional. We only use it so buyers can reach you about a listing.
          </p>
          <p className="ig-settings-note">
            Email is managed by your sign-in account and is not shown on your public profile.
          </p>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          {status && <p className="ig-settings-status">{status}</p>}
        </form>
      )}

      {section === "password" && (
        <form className="ig-settings-form" onSubmit={handlePassword}>
          <label>
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Update password"}
          </button>
          {status && <p className="ig-settings-status">{status}</p>}
        </form>
      )}

      {section === "my-advertisements" && (
        <div className="ig-ads-panel">
          {adsLoading ? (
            <p className="ig-settings-note">{t("loading")}</p>
          ) : myAds.length === 0 ? (
            <div className="ig-ads-empty">
              <p>{t("myAdsEmpty")}</p>
              <button
                type="button"
                className="ig-ads-promote"
                onClick={() => navigate("/")}
              >
                {t("myAdsPromote")}
              </button>
            </div>
          ) : (
            <ul className="ig-ads-list">
              {myAds.map((ad) => {
                const title =
                  [ad.brandName, ad.modelName].filter(Boolean).join(" ") ||
                  ad.title ||
                  t("myAds");
                const active =
                  Number(ad.status) === 2 &&
                  ad.endDate &&
                  new Date(ad.endDate) > new Date();
                const endLabel = ad.endDate
                  ? t("myAdsEnds", {
                      date: new Date(ad.endDate).toLocaleDateString(),
                    })
                  : "";
                const startLabel = ad.startDate
                  ? t("myAdsStarted", {
                      date: new Date(ad.startDate).toLocaleDateString(),
                    })
                  : "";
                return (
                  <li key={ad.id} className="ig-ads-item">
                    <img
                      src={mediaUrl(ad.vehicleImageUrl || ad.imageUrl)}
                      alt={title}
                    />
                    <div>
                      <strong>{title}</strong>
                      <em className={active ? "is-active" : "is-ended"}>
                        {active ? t("myAdsActive") : t("myAdsExpired")}
                        {endLabel ? ` · ${endLabel}` : startLabel ? ` · ${startLabel}` : ""}
                      </em>
                    </div>
                    {ad.vehicleId ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/vehicles/${ad.vehicleId}`)}
                      >
                        {t("myAdsView")}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {section &&
        section !== "edit-profile" &&
        section !== "password" &&
        section !== "my-advertisements" && (
          <p className="ig-settings-status">This page was not found.</p>
        )}
    </div>
  );
};
