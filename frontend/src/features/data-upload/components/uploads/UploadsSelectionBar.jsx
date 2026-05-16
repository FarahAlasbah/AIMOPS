export default function UploadsSelectionBar({
  t,
  selectedCount,
  isDeleting,
  onClearSelection,
  onRequestBulkDelete,
}) {
  if (!selectedCount) return null;

  return (
    <div className="uploads-selection-bar">
      <div className="uploads-selection-text">
        {t("uploadsPage.selectedUploads", {
          count: selectedCount,
        })}
      </div>

      <div className="uploads-selection-actions">
        <button
          type="button"
          className="ghost-btn"
          onClick={onClearSelection}
          disabled={isDeleting}
        >
          {t("uploadsPage.clearSelection")}
        </button>

        <button
          type="button"
          className="ghost-btn danger"
          onClick={onRequestBulkDelete}
          disabled={isDeleting}
        >
          {t("uploadsPage.deleteSelected", {
            count: selectedCount,
          })}
        </button>
      </div>
    </div>
  );
}