import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, FormSelect } from "../../../../shared/components";
import ColumnMeta from "../ColumnMeta";
import { normalizeRole } from "../../utils/analysisUtils";
import RolePickerWithConfirm from "./RolePickerWithConfirm";

export function HighConfidenceCard({
  highConfidence,
  columnMap,
  onSetRole,
  disabled,
}) {
  const { t } = useTranslation("upload");
  const [expanded, setExpanded] = useState({});
  const [pendingMap, setPendingMap] = useState({});

  if (!Array.isArray(highConfidence) || highConfidence.length === 0) {
    return null;
  }

  return (
    <div className="mapping-card">
      <div className="mapping-title">{t("mapping.highConfidence.title")}</div>
      <div className="mapping-sub">{t("mapping.highConfidence.sub")}</div>

      {highConfidence.map((column) => {
        const current = columnMap?.[column.index] || {};
        const isOpen = !!expanded[column.index];

        return (
          <div key={column.index} className="verify-item">
            <div className="verify-head">
              <div style={{ fontWeight: 700, color: "var(--c-text)" }}>
                {column.name}
              </div>

              <button
                type="button"
                className="link-button"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [column.index]: !prev[column.index],
                  }))
                }
              >
                {isOpen ? t("mapping.hideDetails") : t("mapping.showDetails")}
              </button>
            </div>

            <div
              className="mapping-row"
              style={{ marginTop: 10, alignItems: "flex-start" }}
            >
              <div className="role-label" style={{ marginTop: 8 }}>
                {t("mapping.role")}
              </div>

              <RolePickerWithConfirm
                colIndex={column.index}
                value={current.role || column.role}
                suggested={column.role}
                pendingMap={pendingMap}
                setPendingMap={setPendingMap}
                onCommitRole={(index, role) => onSetRole(index, role)}
                disabled={disabled}
              />
            </div>

            {isOpen ? <ColumnMeta column={column} /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function RequiredMissingCard({
  requiredMissing,
  allColumnsOptions,
  requiredMissingMap,
  onPick,
  disabled,
}) {
  const { t } = useTranslation("upload");

  if (!Array.isArray(requiredMissing) || requiredMissing.length === 0) {
    return null;
  }

  return (
    <div className="mapping-card">
      <div className="mapping-title">{t("mapping.requiredMissing.title")}</div>
      <div className="mapping-sub">{t("mapping.requiredMissing.sub")}</div>

      {requiredMissing.map((required) => (
        <div key={required.role} style={{ marginTop: 10 }}>
          <div
            style={{
              fontWeight: 600,
              color: "var(--c-text)",
              marginBottom: 6,
            }}
          >
            {required.name} {t("mapping.requiredMissing.required")}
          </div>

          {required.user_prompt ? (
            <div
              style={{
                fontSize: 13,
                color: "var(--c-text-muted)",
                marginBottom: 8,
              }}
            >
              {required.user_prompt}
            </div>
          ) : null}

          <FormSelect
            label={t("mapping.requiredMissing.chooseColumn")}
            placeholder={t("mapping.requiredMissing.selectColumn")}
            options={allColumnsOptions}
            value={requiredMissingMap?.[required.role] || ""}
            onChange={(event) => onPick(required.role, event.target.value)}
            disabled={!!disabled}
          />
        </div>
      ))}
    </div>
  );
}

export function NeedsMappingCard({
  needsMapping,
  columnMap,
  onSetRole,
  disabled,
}) {
  const { t } = useTranslation("upload");
  const [pendingMap, setPendingMap] = useState({});

  if (!Array.isArray(needsMapping) || needsMapping.length === 0) {
    return null;
  }

  return (
    <div className="mapping-card">
      <div className="mapping-title">{t("mapping.needsMapping.title")}</div>
      <div className="mapping-sub">{t("mapping.needsMapping.sub")}</div>

      {needsMapping.map((column) => {
        const current = columnMap?.[column.index] || {};

        return (
          <div key={column.index} style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, color: "var(--c-text)" }}>
              {column.name}
            </div>

            {column.user_prompt ? (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--c-text-muted)",
                  marginTop: 4,
                }}
              >
                {column.user_prompt}
              </div>
            ) : null}

            <div
              className="mapping-row"
              style={{ marginTop: 10, alignItems: "flex-start" }}
            >
              <div className="role-label" style={{ marginTop: 8 }}>
                {t("mapping.role")}
              </div>

              <RolePickerWithConfirm
                colIndex={column.index}
                value={current.role || "skip"}
                suggested={column.role}
                pendingMap={pendingMap}
                setPendingMap={setPendingMap}
                onCommitRole={(index, role) => onSetRole(index, role)}
                disabled={disabled}
              />
            </div>

            <ColumnMeta column={column} />
          </div>
        );
      })}
    </div>
  );
}

export function NeedsVerificationCard({
  needsVerification,
  columnMap,
  onSetRole,
  onConfirmVerified,
  disabled,
}) {
  const { t } = useTranslation("upload");

  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});
  const [pendingMap, setPendingMap] = useState({});

  const pageSize = 5;

  if (!Array.isArray(needsVerification) || needsVerification.length === 0) {
    return null;
  }

  const total = needsVerification.length;
  const confirmed = needsVerification.filter(
    (column) => !!columnMap?.[column.index]?.verified,
  ).length;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = needsVerification.slice(start, start + pageSize);

  const safeSetPage = (nextPage) => {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  };

  return (
    <div className="mapping-card">
      <div className="mapping-title">
        {t("mapping.needsVerification.title", { confirmed, total })}
      </div>

      <div className="mapping-sub">{t("mapping.needsVerification.sub")}</div>

      <div className="mapping-pager">
        <button
          type="button"
          className="pager-btn"
          onClick={() => safeSetPage(page - 1)}
          disabled={page === 1}
        >
          {t("mapping.needsVerification.prev")}
        </button>

        <div className="pager-page">
          {t("mapping.needsVerification.page", { page, totalPages })}
        </div>

        <button
          type="button"
          className="pager-btn"
          onClick={() => safeSetPage(page + 1)}
          disabled={page === totalPages}
        >
          {t("mapping.needsVerification.next")}
        </button>
      </div>

      <div className="mapping-list">
        {pageItems.map((column) => {
          const current = columnMap?.[column.index] || {};
          const isOpen = !!expanded[column.index];
          const hasPending = !!pendingMap?.[column.index];

          return (
            <div key={column.index} className="verify-item">
              <div className="verify-head">
                <div style={{ fontWeight: 700, color: "var(--c-text)" }}>
                  {column.name}
                </div>
              </div>

              {column.user_prompt ? (
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--c-text-muted)",
                    marginTop: 6,
                  }}
                >
                  {column.user_prompt}
                </div>
              ) : null}

              <div
                className="mapping-row"
                style={{ marginTop: 10, alignItems: "flex-start" }}
              >
                <div className="role-label" style={{ marginTop: 8 }}>
                  {t("mapping.role")}
                </div>

                <div style={{ flex: "1 1 auto", minWidth: 260 }}>
                  <RolePickerWithConfirm
                    colIndex={column.index}
                    value={current.role || "skip"}
                    suggested={column.role}
                    pendingMap={pendingMap}
                    setPendingMap={setPendingMap}
                    onCommitRole={(index, role) => onSetRole(index, role)}
                    disabled={disabled}
                  />
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onConfirmVerified(column.index)}
                  disabled={disabled || !!current.verified || hasPending}
                  title={
                    disabled
                      ? t("mapping.lockedBatch")
                      : hasPending
                        ? t("mapping.confirmRoleChangeFirst")
                        : ""
                  }
                  style={{ alignSelf: "flex-start" }}
                >
                  {current.verified
                    ? t("mapping.needsVerification.confirmed")
                    : t("mapping.needsVerification.confirm")}
                </Button>

                <button
                  type="button"
                  className="link-button"
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [column.index]: !prev[column.index],
                    }))
                  }
                  style={{ alignSelf: "flex-start", marginTop: 8 }}
                >
                  {isOpen ? t("mapping.hideDetails") : t("mapping.showDetails")}
                </button>
              </div>

              {isOpen ? <ColumnMeta column={column} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SuggestedSkipCard({
  suggestedSkip,
  columnMap,
  onToggleInclude,
  onSetRole,
  disabled,
}) {
  const { t } = useTranslation("upload");
  const [pendingMap, setPendingMap] = useState({});

  if (!Array.isArray(suggestedSkip) || suggestedSkip.length === 0) {
    return null;
  }

  return (
    <div className="mapping-card">
      <div className="mapping-title">{t("mapping.suggestedSkip.title")}</div>
      <div className="mapping-sub">{t("mapping.suggestedSkip.sub")}</div>

      {suggestedSkip.map((column) => {
        const current = columnMap?.[column.index] || {};
        const isIncluded = !!current.include;
        const currentRole = normalizeRole(current.role || "skip");

        return (
          <div key={column.index} style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, color: "var(--c-text)" }}>
              {column.name}
            </div>

            {column.reason ? (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--c-text-muted)",
                  marginTop: 4,
                }}
              >
                {t("mapping.suggestedSkip.whySkip")} {column.reason}
              </div>
            ) : null}

            {!isIncluded ? (
              <div className="skip-state-row" style={{ marginTop: 12 }}>
                <span className="skip-state-badge">
                  {t("mapping.suggestedSkip.skipped")}
                </span>

                <button
                  type="button"
                  className="skip-link-btn"
                  onClick={() => onToggleInclude(column.index)}
                  disabled={!!disabled}
                  title={disabled ? t("mapping.lockedBatch") : ""}
                >
                  {t("mapping.suggestedSkip.includeColumn")}
                </button>
              </div>
            ) : (
              <div
                className="mapping-row"
                style={{ marginTop: 12, alignItems: "flex-start" }}
              >
                <button
                  type="button"
                  className="mini-btn"
                  onClick={() => onToggleInclude(column.index)}
                  disabled={!!disabled}
                  title={disabled ? t("mapping.lockedBatch") : ""}
                >
                  {t("mapping.suggestedSkip.skipThisColumn")}
                </button>

                <div style={{ flex: "1 1 auto", minWidth: 260 }}>
                  <RolePickerWithConfirm
                    colIndex={column.index}
                    value={currentRole}
                    suggested="skip"
                    pendingMap={pendingMap}
                    setPendingMap={setPendingMap}
                    onCommitRole={(index, role) => onSetRole(index, role)}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}

            <ColumnMeta column={column} showConfidence={false} />
          </div>
        );
      })}
    </div>
  );
}