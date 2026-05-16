import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Card, PageHeader } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";

import ReviewStep from "../components/ReviewStep";
import { ReviewPageSkeleton } from "../components/Skeletons";
import ReviewPageHelp from "../components/review/ReviewPageHelp";

import { useReviewPage } from "../hooks/useReviewPage";

export default function ReviewPage() {
  const { t } = useTranslation("upload");
  const navigate = useNavigate();
  const location = useLocation();
  const { batchId } = useParams();

  const {
    localLoading,
    error,
    confirmMappingsResult,
    products,
    productsDraft,
    confirmProductsResult,
    confirmingProducts,
    alreadyProcessed,
    canConfirmProducts,

    toggleMerge,
    handleConfirmProducts,
  } = useReviewPage({
    batchId,
    locationState: location.state,
    t,
  });

  return (
    <div className="data-upload-page">
      <PageHeader actions={<ReviewPageHelp t={t} />} />

      <Card>
        {localLoading ? (
          <ReviewPageSkeleton />
        ) : (
          <>
            {error ? (
              <div style={{ marginBottom: 12 }}>
                <InfoMessage type="error">{error}</InfoMessage>
              </div>
            ) : null}

            {alreadyProcessed && !confirmProductsResult?.success ? (
              <div style={{ marginBottom: 12 }}>
                <InfoMessage type="info">
                  {t("reviewPage.alreadyProcessedInfo")}
                </InfoMessage>
              </div>
            ) : null}

            {!confirmMappingsResult?.success ? (
              <div style={{ marginBottom: 12 }}>
                <InfoMessage type="warn">
                  {t("reviewPage.noMappingsWarn")}
                </InfoMessage>
              </div>
            ) : null}

            {confirmMappingsResult?.success && products.length === 0 ? (
              <div style={{ marginBottom: 12 }}>
                <InfoMessage type="info">
                  {t("reviewPage.noProductNameInfo")}
                </InfoMessage>
              </div>
            ) : null}

            <ReviewStep
              batchId={batchId}
              confirmMappingsResult={confirmMappingsResult}
              products={products}
              productsDraft={productsDraft}
              confirmProductsResult={confirmProductsResult}
              confirmingProducts={confirmingProducts}
              alreadyProcessed={alreadyProcessed}
              onToggleMerge={toggleMerge}
              onConfirmProducts={
                canConfirmProducts ? handleConfirmProducts : () => {}
              }
              onBack={() => navigate(`/app/data-upload/map/${batchId}`)}
              onFinish={() => navigate("/app/data-upload/uploads")}
            />
          </>
        )}
      </Card>
    </div>
  );
}