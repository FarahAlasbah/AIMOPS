// frontend/src/features/products/components/ProductsPager.jsx
import { useTranslation } from "react-i18next";
import { Button } from "../../../shared/components";

export default function ProductsPager({
  loading,
  page,
  totalPages,
  pageSize,
  onPageSizeChange,
  onPrev,
  onNext,
}) {
  const { t } = useTranslation("products");

  return (
    <div className="pager">
      <div className="pager-left">
        <div className="field inline">
          <label>{t("pager.rowsLabel")}</label>
          <select
            className="text"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="muted">
          {t("pager.pageOf", { page, totalPages })}
        </div>
      </div>

      <div className="pager-right">
        <Button variant="secondary" disabled={loading || page <= 1} onClick={onPrev}>
          {t("pager.previous")}
        </Button>

        <Button variant="secondary" disabled={loading || page >= totalPages} onClick={onNext}>
          {t("pager.next")}
        </Button>
      </div>
    </div>
  );
}