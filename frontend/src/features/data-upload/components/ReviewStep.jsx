import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, FormActions } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import MergeModal from "./review/MergeModal";
import ReviewProductList from "./review/ReviewProductList";

import {
  getSelectedMerges,
  safeArr,
  uniq,
} from "../utils/reviewStepUtils";

import "./ReviewStep.css";

export default function ReviewStep({
  confirmMappingsResult,
  products,
  productsDraft,
  confirmProductsResult,
  confirmingProducts,
  alreadyProcessed = false,
  onToggleMerge,
  onConfirmProducts,
  onBack,
  onFinish,
}) {
  const { t } = useTranslation("upload");
  const [activeNorm, setActiveNorm] = useState("");

  const locked = !!confirmProductsResult?.success || !!alreadyProcessed;

  const allPrimaryNames = useMemo(
    () => uniq(safeArr(products).map((product) => product.primary_name)).filter(Boolean),
    [products],
  );

  const productsByNormalizedName = useMemo(() => {
    const map = new Map();

    safeArr(products).forEach((product) => {
      map.set(product.normalized_name, product);
    });

    return map;
  }, [products]);

  const mergedTotal = useMemo(
    () =>
      safeArr(productsDraft).reduce(
        (acc, product) =>
          acc + safeArr(product?.merge_with).filter(Boolean).length,
        0,
      ),
    [productsDraft],
  );

  const confirmedCount = safeArr(
    confirmMappingsResult?.confirmed_mappings,
  ).length;

  const activeProduct = activeNorm
    ? productsByNormalizedName.get(activeNorm)
    : null;

  const activeSelected = useMemo(
    () =>
      activeProduct
        ? getSelectedMerges(productsDraft, activeProduct.normalized_name)
        : [],
    [productsDraft, activeProduct],
  );

  const activeCandidates = useMemo(
    () =>
      activeProduct
        ? allPrimaryNames.filter((name) => name !== activeProduct.primary_name)
        : [],
    [allPrimaryNames, activeProduct],
  );

  const productCount = safeArr(products).length;
  const hasProducts = productCount > 0;

  const handleSaveMerges = (nextSelected) => {
    if (!activeProduct) return;

    const normalizedName = activeProduct.normalized_name;
    const currentSelected = getSelectedMerges(productsDraft, normalizedName);

    const currentSet = new Set(currentSelected);
    const nextSet = new Set(nextSelected);
    const allNames = uniq([...currentSelected, ...nextSelected]);

    allNames.forEach((name) => {
      const wasSelected = currentSet.has(name);
      const isSelected = nextSet.has(name);

      if (wasSelected !== isSelected) {
        onToggleMerge(normalizedName, name);
      }
    });

    setActiveNorm("");
  };

  return (
    <div className="review-step">
      <div className="review-header">
        <div>
          <div className="review-title">{t("review.title")}</div>

          <div className="review-sub">
            {hasProducts
              ? t("review.subExtracted", {
                  count: productCount,
                  merges: mergedTotal,
                })
              : t("review.subNotExtracted")}
          </div>
        </div>

        <div className="review-header-right">
          {confirmMappingsResult?.success ? (
            <span className="badge confirmed-badge">
              {t("review.confirmedOnly", {
                count: confirmedCount,
                defaultValue: `Confirmed (${confirmedCount})`,
              })}
            </span>
          ) : (
            <span className="badge warn">{t("review.mappingsNotFound")}</span>
          )}
        </div>
      </div>

      {confirmProductsResult?.success ? (
        <InfoMessage type="success">
          {t("review.productsConfirmedSuccess")}
        </InfoMessage>
      ) : null}

      {!hasProducts ? (
        <FormActions>
          <Button type="button" variant="secondary" onClick={onBack}>
            {t("review.back")}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={onFinish}
            disabled={!locked}
          >
            {t("review.finish")}
          </Button>
        </FormActions>
      ) : null}

      {hasProducts ? (
        <>
          <ReviewProductList
            products={products}
            productsDraft={productsDraft}
            locked={locked}
            onOpenMerge={setActiveNorm}
          />

          <FormActions>
            <Button type="button" variant="secondary" onClick={onBack}>
              {t("review.back")}
            </Button>

            <div className="right-actions">
              <Button
                type="button"
                onClick={onConfirmProducts}
                disabled={confirmingProducts || locked}
              >
                {locked
                  ? alreadyProcessed && !confirmProductsResult?.success
                    ? t("review.alreadyProcessed", {
                        defaultValue: "Already processed",
                      })
                    : t("review.confirmed")
                  : confirmingProducts
                    ? t("review.confirmingProducts")
                    : t("review.confirmProducts")}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={onFinish}
                disabled={!locked}
              >
                {t("review.finish")}
              </Button>
            </div>
          </FormActions>

          <MergeModal
            open={!!activeNorm}
            product={activeProduct}
            candidates={activeCandidates}
            selected={activeSelected}
            locked={locked}
            onSave={handleSaveMerges}
            onClose={() => setActiveNorm("")}
          />
        </>
      ) : null}
    </div>
  );
}