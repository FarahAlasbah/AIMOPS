import InfoMessage from "../../../../shared/components/InfoMessage";

export default function UploadsMessages({ t, error, warning, onDismissWarning }) {
  return (
    <>
      {error ? (
        <div style={{ marginBottom: 16 }}>
          <InfoMessage type="error">{error}</InfoMessage>
        </div>
      ) : null}

      {warning ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: "1 1 auto" }}>
              <InfoMessage type="warn">{warning}</InfoMessage>
            </div>

            <button
              type="button"
              className="ghost-btn"
              onClick={onDismissWarning}
              style={{ whiteSpace: "nowrap" }}
            >
              {t("uploadsPage.dismiss")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}