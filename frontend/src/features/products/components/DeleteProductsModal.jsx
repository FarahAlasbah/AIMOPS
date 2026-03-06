// frontend/src/features/products/components/DeleteProductsModal.jsx
import { useTranslation } from "react-i18next";
import Modal from "./Modal";
import { Button } from "../../../shared/components";
import DangerButton from "./DangerButton";

export default function DeleteProductsModal({
  open,
  busy,
  onClose,
  onSubmit,
  selectedCount,
  anyHasSales,
}) {
  const { t } = useTranslation("products");

  return (
    <Modal
      title={t("deleteModal.title")}
      open={open}
      onClose={() => !busy && onClose()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("deleteModal.cancel")}
          </Button>
          <DangerButton onClick={onSubmit} disabled={busy}>
            {busy ? t("deleteModal.deleting") : t("deleteModal.delete")}
          </DangerButton>
        </>
      }
    >
      <div>
        <div
          className="muted"
          dangerouslySetInnerHTML={{
            __html: t("deleteModal.confirmText", { count: selectedCount }),
          }}
        />

        {anyHasSales ? (
          <div className="warn-box" style={{ marginTop: 10 }}>
            {t("deleteModal.salesWarning")}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}