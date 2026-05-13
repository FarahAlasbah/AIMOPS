// frontend/src/features/products/components/ProductsPager.jsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button, FormSelect } from "../../../shared/components";

function normalizeSelectValue(value) {
  if (value?.target?.value != null) return value.target.value;
  if (value?.value != null) return value.value;
  return value;
}

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

  const pageSizeOptions = useMemo(
    () => [
      { value: "10", label: "10" },
      { value: "15", label: "15" },
      { value: "25", label: "25" },
      { value: "50", label: "50" },
    ],
    [],
  );

  return (
    <div className="pager">
      <div className="pager-left">
        <div className="field inline pager-page-size-field">
          <FormSelect
            label={t("pager.rowsLabel")}
            value={String(pageSize)}
            onChange={(event) =>
              onPageSizeChange(Number(normalizeSelectValue(event)))
            }
            options={pageSizeOptions}
            disabled={loading}
          />
        </div>

        <div className="muted">{t("pager.pageOf", { page, totalPages })}</div>
      </div>

      <div className="pager-right">
        <Button
          variant="secondary"
          disabled={loading || page <= 1}
          onClick={onPrev}
        >
          {t("pager.previous")}
        </Button>

        <Button
          variant="secondary"
          disabled={loading || page >= totalPages}
          onClick={onNext}
        >
          {t("pager.next")}
        </Button>
      </div>
    </div>
  );
}