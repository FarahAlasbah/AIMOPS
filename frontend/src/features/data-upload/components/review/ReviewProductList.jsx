import { useTranslation } from "react-i18next";
import { getSelectedMerges, safeArr } from "../../utils/reviewStepUtils";

export default function ReviewProductList({
  products,
  productsDraft,
  locked,
  onOpenMerge,
}) {
  const { t } = useTranslation("upload");

  return (
    <div className="products-list">
      {safeArr(products).map((product) => {
        const selected = getSelectedMerges(
          productsDraft,
          product.normalized_name,
        );

        return (
          <div className="product-row" key={product.normalized_name}>
            <div className="product-main">
              <div className="product-name">{product.primary_name}</div>

              <div className="product-category-simple">
                <span className="product-category-simple-label">
                  {t("review.category", {
                    defaultValue: "Category",
                  })}
                </span>

                <span className="product-category-simple-value">
                  {product.category ||
                    t("review.uncategorized", {
                      defaultValue: "Uncategorized",
                    })}
                </span>
              </div>

              {safeArr(product.possible_typos).length > 0 ? (
                <div className="product-typos">
                  {product.possible_typos.map((typo) => (
                    <span
                      key={typo.product}
                      className="typo-chip"
                      title={typo.suggestion}
                    >
                      ⚠ {typo.product}
                    </span>
                  ))}
                </div>
              ) : null}

              {selected.length > 0 ? (
                <div className="selected-wrap">
                  {selected.slice(0, 4).map((value) => (
                    <span key={value} className="selected-chip readonly" title={value}>
                      {value}
                    </span>
                  ))}

                  {selected.length > 4 ? (
                    <span className="more-chip">
                      +{selected.length - 4} more
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="selected-empty">
                  {t("review.noMergesSelected")}
                </div>
              )}
            </div>

            <div className="product-actions">
              <button
                type="button"
                className="manage-btn"
                onClick={() => onOpenMerge(product.normalized_name)}
                disabled={locked}
                title={locked ? t("review.alreadyConfirmed") : ""}
              >
                {t("review.manageMerges")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}