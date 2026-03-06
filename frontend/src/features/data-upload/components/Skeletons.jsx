// frontend/src/features/data-upload/components/Skeletons.jsx
import React from "react";
import { useTranslation } from "react-i18next";

function S({ className = "", style = {} }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function AnalyzeProgress({
  percent = 0,
  label,
}) {
  const { t } = useTranslation("upload");
  const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  const resolvedLabel = label ?? t("analyzeProgress.defaultLabel");

  return (
    <div className="analyze-progress-wrap" role="status" aria-live="polite">
      <div className="analyze-progress-card">
        <div className="analyze-circle" style={{ ["--p"]: p }}>
          <div className="analyze-circle-inner">
            <div className="analyze-percent">{p}%</div>
            <div className="analyze-sub">{t("analyzeProgress.loading")}</div>
          </div>
        </div>

        <div className="analyze-label">{resolvedLabel}</div>
        <div className="analyze-hint">{t("analyzeProgress.hint")}</div>
      </div>
    </div>
  );
}

export function UploadCardSkeleton() {
  return (
    <div className="upload-card">
      <div className="upload-card-head">
        <div className="upload-card-title-row">
          <S className="skeleton-line" style={{ height: 16, width: "65%" }} />
          <S className="skeleton-pill" style={{ height: 28, width: 90 }} />
        </div>
        <div style={{ marginTop: 10 }}>
          <S className="skeleton-line" style={{ height: 12, width: "40%" }} />
        </div>
      </div>

      <div className="upload-kv-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="upload-kv">
            <S className="skeleton-line" style={{ height: 10, width: "45%" }} />
            <div style={{ marginTop: 8 }}>
              <S className="skeleton-line" style={{ height: 14, width: "70%" }} />
            </div>
          </div>
        ))}
      </div>

      <div className="upload-flags">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <S className="skeleton-pill" style={{ height: 26, width: 120 }} />
          <S className="skeleton-pill" style={{ height: 26, width: 120 }} />
        </div>
      </div>

      <div className="upload-actions-row">
        <div className="upload-actions-main">
          <S className="skeleton-btn" style={{ height: 36, width: 120 }} />
          <S className="skeleton-btn" style={{ height: 36, width: 96 }} />
        </div>

        <div className="upload-actions-aux">
          <S className="skeleton-btn" style={{ height: 34, width: 130 }} />
          <S className="skeleton-btn" style={{ height: 34, width: 96 }} />
        </div>
      </div>
    </div>
  );
}

export function UploadsListSkeleton({ count = 6 }) {
  return (
    <>
      <div className="uploads-grid">
        {Array.from({ length: count }).map((_, i) => (
          <UploadCardSkeleton key={i} />
        ))}
      </div>

      <div className="pager">
        <div className="pager-info">
          <S className="skeleton-line" style={{ height: 12, width: 160 }} />
        </div>
        <div className="pager-actions">
          <S className="skeleton-btn" style={{ height: 34, width: 70 }} />
          <S className="skeleton-line" style={{ height: 12, width: 160 }} />
          <S className="skeleton-btn" style={{ height: 34, width: 70 }} />
        </div>
      </div>
    </>
  );
}

function MappingCardSkeleton({ rows = 3 }) {
  return (
    <div className="mapping-card">
      <S className="skeleton-line" style={{ height: 14, width: "45%" }} />
      <div style={{ marginTop: 10 }}>
        <S className="skeleton-line" style={{ height: 12, width: "65%" }} />
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            style={{
              borderTop: "1px solid var(--c-border)",
              paddingTop: 12,
            }}
          >
            <S className="skeleton-line" style={{ height: 14, width: "55%" }} />
            <div style={{ marginTop: 10 }}>
              <S className="skeleton-line" style={{ height: 34, width: "100%" }} />
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <S className="skeleton-line" style={{ height: 12, width: "80%" }} />
              <S className="skeleton-line" style={{ height: 12, width: "70%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MappingStepSkeleton() {
  return (
    <>
      <div className="mapping-section">
        <MappingCardSkeleton rows={3} />
        <MappingCardSkeleton rows={2} />
        <MappingCardSkeleton rows={3} />
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <S className="skeleton-btn" style={{ height: 38, width: 90 }} />
        <S className="skeleton-btn" style={{ height: 38, width: 160 }} />
      </div>
    </>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="mapping-card" style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <S className="skeleton-line" style={{ height: 16, width: "55%" }} />
          <div style={{ marginTop: 8 }}>
            <S className="skeleton-line" style={{ height: 12, width: "35%" }} />
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <S className="skeleton-pill" style={{ height: 26, width: 80 }} />
            <S className="skeleton-pill" style={{ height: 26, width: 80 }} />
            <S className="skeleton-pill" style={{ height: 26, width: 90 }} />
            <S className="skeleton-pill" style={{ height: 26, width: 110 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <S className="skeleton-btn" style={{ height: 34, width: 80 }} />
        </div>
      </div>
    </div>
  );
}

export function ProductsListSkeleton({ count = 6 }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div className="mapping-card" style={{ marginTop: 10 }}>
        <S className="skeleton-line" style={{ height: 14, width: 220 }} />
        <div style={{ marginTop: 10 }}>
          <S className="skeleton-line" style={{ height: 12, width: "70%" }} />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <S className="skeleton-line" style={{ height: 38, width: "45%" }} />
          <S className="skeleton-line" style={{ height: 38, width: 220 }} />
          <S className="skeleton-line" style={{ height: 38, width: 140 }} />
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <S className="skeleton-btn" style={{ height: 34, width: 70 }} />
          <S className="skeleton-line" style={{ height: 12, width: 160 }} />
          <S className="skeleton-btn" style={{ height: 34, width: 70 }} />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ConfirmProductsSkeleton() {
  return (
    <div className="mapping-card" style={{ marginTop: 16 }}>
      <S className="skeleton-line" style={{ height: 14, width: 220 }} />
      <div style={{ marginTop: 10 }}>
        <S className="skeleton-line" style={{ height: 12, width: "75%" }} />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <S className="skeleton-btn" style={{ height: 38, width: 160 }} />
        <S className="skeleton-line" style={{ height: 12, width: 180 }} />
      </div>
    </div>
  );
}

export function ReviewPageSkeleton() {
  return (
    <div style={{ padding: 12 }}>
      <S className="skeleton-line" style={{ height: 18, width: 160 }} />
      <div style={{ marginTop: 10 }}>
        <S className="skeleton-line" style={{ height: 12, width: 220 }} />
      </div>

      <div className="mapping-card" style={{ marginTop: 12 }}>
        <S className="skeleton-line" style={{ height: 14, width: 220 }} />
        <div style={{ marginTop: 10 }}>
          <S className="skeleton-line" style={{ height: 12, width: "75%" }} />
        </div>
        <div style={{ marginTop: 12 }}>
          <S className="skeleton-btn" style={{ height: 36, width: 140 }} />
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="mapping-card">
            <S className="skeleton-line" style={{ height: 14, width: "55%" }} />
            <div style={{ marginTop: 10 }}>
              <S className="skeleton-line" style={{ height: 12, width: "35%" }} />
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <S className="skeleton-pill" style={{ height: 26, width: 90 }} />
              <S className="skeleton-pill" style={{ height: 26, width: 90 }} />
              <S className="skeleton-pill" style={{ height: 26, width: 110 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <S className="skeleton-btn" style={{ height: 38, width: 90 }} />
        <S className="skeleton-btn" style={{ height: 38, width: 120 }} />
      </div>
    </div>
  );
}