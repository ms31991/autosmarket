import "./ListingUploadBar.css";
import { useLanguage } from "../i18n/LanguageContext";
import { dismissListingUpload, useListingUpload } from "../utils/listingUpload";

export function ListingUploadBar() {
  const upload = useListingUpload();
  const { t } = useLanguage();

  if (!upload) return null;

  const percent = Math.max(0, Math.min(100, Number(upload.progress) || 0));
  const failed = upload.status === "error";
  const label = failed
    ? t(upload.error || "createFail")
    : upload.name;

  return (
    <div
      className={`listing-upload-bar${failed ? " is-error" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="listing-upload-photo">
        {upload.photoUrl ? (
          <img src={upload.photoUrl} alt="" />
        ) : (
          <span className="listing-upload-photo-empty" />
        )}
      </div>
      <span className="listing-upload-name">{label}</span>
      <div className="listing-upload-track">
        <div
          className="listing-upload-fill"
          style={{ width: `${failed ? 100 : percent}%` }}
        />
      </div>
      {failed ? null : <span className="listing-upload-pct">{percent}%</span>}
      <button
        type="button"
        className="listing-upload-close"
        aria-label="Close"
        onClick={() => dismissListingUpload()}
      >
        ×
      </button>
    </div>
  );
}
