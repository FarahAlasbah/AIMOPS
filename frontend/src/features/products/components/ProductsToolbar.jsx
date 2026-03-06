// frontend/src/features/products/components/ProductsToolbar.jsx
import { useTranslation } from "react-i18next";
import { Button } from "../../../shared/components";
import DangerButton from "./DangerButton";

export default function ProductsToolbar({
  loading,
  resultsCount,
  selectedCount,
  q,
  onQChange,
  category,
  categories,
  onCategoryChange,
  active,
  onActiveChange,
  suspicious,
  onSuspiciousChange,
  hasSales,
  onHasSalesChange,
  onRefresh,
  onMergeSelected,
  onDeleteSelected,
  canMerge,
  canDelete,
}) {
  const { t } = useTranslation("products");

  const statusText = loading
    ? t("toolbar.loading")
    : t("toolbar.results", { count: resultsCount });

  const selectionText = selectedCount
    ? ` • ${t("toolbar.selected", { count: selectedCount })}`
    : "";

  return (
    <div className="products-toolbar">
      <div className="products-toolbar-left">
        <div className="field">
          <label>{t("toolbar.searchLabel")}</label>
          <input
            className="text"
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            placeholder={t("toolbar.searchPlaceholder")}
          />
        </div>

        <div className="field">
          <label>{t("toolbar.categoryLabel")}</label>
          <select className="text" value={category} onChange={(e) => onCategoryChange(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? t("toolbar.categoryAll") : c}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>{t("toolbar.statusLabel")}</label>
          <select className="text" value={active} onChange={(e) => onActiveChange(e.target.value)}>
            <option value="all">{t("toolbar.statusAll")}</option>
            <option value="active">{t("toolbar.statusActive")}</option>
            <option value="inactive">{t("toolbar.statusInactive")}</option>
          </select>
        </div>

        <div className="field">
          <label>{t("toolbar.suspiciousLabel")}</label>
          <select className="text" value={suspicious} onChange={(e) => onSuspiciousChange(e.target.value)}>
            <option value="all">{t("toolbar.suspiciousAll")}</option>
            <option value="suspicious">{t("toolbar.suspiciousOnly")}</option>
            <option value="normal">{t("toolbar.normalOnly")}</option>
          </select>
        </div>

        <div className="field">
          <label>{t("toolbar.salesLabel")}</label>
          <select className="text" value={hasSales} onChange={(e) => onHasSalesChange(e.target.value)}>
            <option value="all">{t("toolbar.salesAll")}</option>
            <option value="has">{t("toolbar.salesHas")}</option>
            <option value="none">{t("toolbar.salesNone")}</option>
          </select>
        </div>
      </div>

      <div className="products-toolbar-right">
        <div className="muted">
          {statusText}{selectionText}
        </div>

        <Button onClick={onRefresh} variant="secondary" disabled={loading}>
          {t("toolbar.btnRefresh")}
        </Button>

        <Button onClick={onMergeSelected} disabled={loading || !canMerge}>
          {t("toolbar.btnMergeSelected")}
        </Button>

        <DangerButton onClick={onDeleteSelected} disabled={loading || !canDelete}>
          {t("toolbar.btnDeleteSelected")}
        </DangerButton>
      </div>
    </div>
  );
}