import { useTranslation } from "react-i18next";

import { Card, PageHeader } from "../../../shared/components";

import ConfirmDialog from "../components/ConfirmDialog";
import UploadStep from "../components/UploadStep";
import UploadsList from "../components/UploadsList";

import UploadsMessages from "../components/uploads/UploadsMessages";
import UploadsPageHelp from "../components/uploads/UploadsPageHelp";
import UploadsSelectionBar from "../components/uploads/UploadsSelectionBar";
import UploadsToolbar from "../components/uploads/UploadsToolbar";

import { MAX_MB } from "../utils/fileUtils";
import { UPLOADS_PAGE_LIMIT } from "../utils/uploadsPageUtils";
import { useUploadsPage } from "../hooks/useUploadsPage";

import "../components/UploadCard.css";

export default function UploadsPage() {
  const { t } = useTranslation("upload");

  const {
    error,
    warning,
    setWarning,

    uploadedFile,
    uploading,
    progress,
    fileInputKey,
    handleFileSelect,
    resetUploadForm,
    handleUpload,

    uploadsLoading,
    uploads,
    offset,
    totalCount,
    hasNextPage,
    fetchUploads,

    sortBy,
    setSortByValue,
    searchQuery,
    setSearchQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortOptions,
    clearFilters,
    hasActiveFilters,

    deletingIds,
    isDeleting,
    confirmOpen,
    confirmTitle,
    confirmText,
    confirmMessage,
    closeConfirm,
    confirmDelete,

    selectedBatchIdSet,
    selectedCount,
    toggleSelectUpload,
    toggleSelectVisible,
    clearSelection,
    requestDelete,
    requestBulkDelete,

    setOffset,

    canOpenReviewForUpload,
    isCompletedUploadStatus,
    navigate,
  } = useUploadsPage(t);

  return (
    <div className="data-upload-page">
      <PageHeader actions={<UploadsPageHelp t={t} />} />

      <Card>
        <UploadsMessages
          t={t}
          error={error}
          warning={warning}
          onDismissWarning={() => setWarning("")}
        />

        <UploadStep
          onFileSelect={handleFileSelect}
          uploading={uploading}
          progress={progress}
          maxMb={MAX_MB}
          onCancel={resetUploadForm}
          onUpload={handleUpload}
          fileInputKey={fileInputKey}
          canUpload={!!uploadedFile}
          selectedFile={uploadedFile}
        />

        <div style={{ marginTop: 18 }}>
          <UploadsToolbar
            t={t}
            uploadsLoading={uploadsLoading}
            isDeleting={isDeleting}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            sortBy={sortBy}
            sortOptions={sortOptions}
            onSortChange={setSortByValue}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
            onRefresh={() => fetchUploads(offset)}
          />

          <UploadsSelectionBar
            t={t}
            selectedCount={selectedCount}
            isDeleting={isDeleting}
            onClearSelection={clearSelection}
            onRequestBulkDelete={requestBulkDelete}
          />

          <UploadsList
            uploads={uploads}
            loading={uploadsLoading}
            offset={offset}
            totalCount={totalCount}
            hasNext={hasNextPage}
            onPrev={() =>
              setOffset((previous) =>
                Math.max(0, previous - UPLOADS_PAGE_LIMIT),
              )
            }
            onNext={() =>
              setOffset((previous) => previous + UPLOADS_PAGE_LIMIT)
            }
            canOpenReview={canOpenReviewForUpload}
            isCompletedUpload={(upload) =>
              isCompletedUploadStatus(upload?.status)
            }
            onCompletedOpen={(upload) =>
              navigate("/app/products", {
                state: {
                  completedUploadRedirect: true,
                  completedUploadFileName: upload?.fileName || "",
                },
              })
            }
            onOpenMapping={(id) => navigate(`/app/data-upload/map/${id}`)}
            onReview={(id) => navigate(`/app/data-upload/review/${id}`)}
            onDelete={requestDelete}
            deletingIds={deletingIds}
            selectedIds={selectedBatchIdSet}
            onToggleSelect={toggleSelectUpload}
            onToggleSelectVisible={toggleSelectVisible}
            selectionDisabled={isDeleting}
          />
        </div>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        cancelText={t("uploadsPage.deleteDialogCancel")}
        confirmText={confirmText}
        busy={isDeleting}
        onCancel={() => {
          if (isDeleting) return;
          closeConfirm();
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}