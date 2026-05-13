// frontend/src/features/products/components/ProductsTable.jsx
import { useTranslation } from "react-i18next";
import { Button } from "../../../shared/components";
import SkeletonRow from "./SkeletonRow";
import DangerButton from "./DangerButton";
import { money, dateText } from "../utils/formatters";

export default function ProductsTable({
  loading,
  pageItems,
  selected,
  onTogglePageAll,
  onToggleOne,
  onToggleSort,
  onMergeRow,
  onDeleteRow,
}) {
  const { t, i18n } = useTranslation("products");
  const pageDir = i18n.dir();

  return (
    <div className="table-wrap">
      <table className="products-table" dir={pageDir}>
        <thead>
          <tr>
            <th style={{ width: 42 }}>
              <input
                type="checkbox"
                checked={
                  pageItems.length > 0 &&
                  pageItems.every((p) => selected.has(p.product_id))
                }
                onChange={onTogglePageAll}
                disabled={loading || pageItems.length === 0}
                aria-label={t("table.selectPage")}
              />
            </th>

            <th className="click" onClick={() => onToggleSort("name")}>
              {t("table.colName")}
            </th>

            <th className="click" onClick={() => onToggleSort("category")}>
              {t("table.colCategory")}
            </th>

            <th className="click" onClick={() => onToggleSort("suspicious")}>
              {t("table.colNeedsReview")}
            </th>

            <th className="click" onClick={() => onToggleSort("sales")}>
              {t("table.colSales")}
            </th>

            <th className="click" onClick={() => onToggleSort("revenue")}>
              {t("table.colRevenue")}
            </th>

            <th className="click" onClick={() => onToggleSort("last_sale")}>
              {t("table.colLastSale")}
            </th>

            <th style={{ width: 180 }}>{t("table.colActions")}</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <>
              <SkeletonRow cols={8} />
              <SkeletonRow cols={8} />
              <SkeletonRow cols={8} />
              <SkeletonRow cols={8} />
              <SkeletonRow cols={8} />
              <SkeletonRow cols={8} />
            </>
          ) : pageItems.length === 0 ? (
            <tr>
              <td colSpan={8} className="empty">
                {t("table.empty")}
              </td>
            </tr>
          ) : (
            pageItems.map((p) => {
              const id = p.product_id;
              const isSuspicious = !!p?.flags?.is_suspicious;
              const reason = p?.flags?.reason;
              const sales = Number(p?.stats?.total_sales || 0);

              return (
                <tr key={id} className={isSuspicious ? "row-suspicious" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(id)}
                      onChange={() => onToggleOne(id)}
                      aria-label={t("table.selectProduct", {
                        name: p.product_name || id,
                      })}
                    />
                  </td>

                  <td title={p.normalized_name || ""}>
                    <div className="name-cell">
                      <div className="name">
                        <bdi>{p.product_name || "-"}</bdi>
                      </div>

                      <div className="sub muted">
                        <bdi>{p.normalized_name || "-"}</bdi>
                      </div>
                    </div>
                  </td>

                  <td>
                    <bdi>{p.category ?? "-"}</bdi>
                  </td>

                  <td>
                    {isSuspicious ? (
                      <div className="flag">
                        <span className="chip chip-warn">
                          {t("table.chipNeedsReview")}
                        </span>

                        <div className="sub muted" title={reason || ""}>
                          <bdi>{reason || "—"}</bdi>
                        </div>
                      </div>
                    ) : (
                      <span className="chip chip-ok">
                        {t("table.chipNormal")}
                      </span>
                    )}
                  </td>

                  <td>{sales}</td>

                  <td>{money(p?.stats?.total_revenue, i18n.language)}</td>

                  <td>{dateText(p?.stats?.last_sale, i18n.language)}</td>

                  <td className="actions">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onMergeRow(id)}
                    >
                      {t("table.btnMerge")}
                    </Button>

                    <DangerButton size="sm" onClick={() => onDeleteRow(id)}>
                      {t("table.btnDelete")}
                    </DangerButton>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}