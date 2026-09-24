import "./ConfirmCard.css";

export function ConfirmCard({
  open,
  title = "Are you sure?",
  message,
  yesLabel = "Yes",
  cancelLabel = "Cancel",
  onYes,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="confirm-card-overlay" onClick={onCancel} role="presentation">
      <div
        className="confirm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-card-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-card-title">{title}</h2>
        {message ? <p>{message}</p> : null}
        <div className="confirm-card-actions">
          <button type="button" onClick={onYes}>
            {yesLabel}
          </button>
          <button type="button" className="confirm-card-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
