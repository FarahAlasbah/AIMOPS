// frontend/src/features/data-upload/components/MappingStep.jsx
import { useState } from "react";
import { Button, FormActions, FormSelect } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";
import ColumnMeta from "./ColumnMeta";
import { ROLE_DEFS, normalizeRole, roleLabel } from "../utils/analysisUtils";
import { MappingStepSkeleton } from "./Skeletons";

function RolePills({ value, onChange, disabled }) {
  const current = normalizeRole(value);

  return (
    <div className="role-picker">
      <div className="role-pills">
        {ROLE_DEFS.map((r) => {
          const active = current === r.value;
          const isSkip = r.value === "skip";
          return (
            <button
              key={r.value}
              type="button"
              className={`role-pill ${active ? "active" : ""} ${isSkip ? "skip" : ""}`}
              onClick={() => !disabled && onChange(r.value)}
              aria-pressed={active}
              disabled={!!disabled}
              title={disabled ? "Mappings are locked for this batch." : ""}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RolePickerWithConfirm({
  colIndex,
  value,
  suggested,
  pendingMap,
  setPendingMap,
  onCommitRole,
  disabled,
}) {
  const committed = normalizeRole(value);
  const sug = normalizeRole(suggested);

  const pendingRole = pendingMap?.[colIndex] ? normalizeRole(pendingMap[colIndex]) : "";
  const displayRole = pendingRole || committed;

  const commitNow = (role) => {
    setPendingMap?.((prev) => {
      const copy = { ...(prev || {}) };
      delete copy[colIndex];
      return copy;
    });
    onCommitRole?.(colIndex, role);
  };

  const setPending = (role) => {
    setPendingMap?.((prev) => ({ ...(prev || {}), [colIndex]: role }));
  };

  const handlePick = (nextRoleRaw) => {
    if (disabled) return;

    const nextRole = normalizeRole(nextRoleRaw);

    if (!sug || nextRole === sug) {
      commitNow(nextRole);
      return;
    }

    setPending(nextRole);
  };

  const hasPending = !!pendingRole;

  return (
    <div style={{ width: "100%" }}>
      <RolePills value={displayRole} onChange={handlePick} disabled={disabled} />

      {!disabled && !hasPending && sug && committed !== sug && (
        <div className="role-warn">
          Not the suggested role. Suggested: <strong>{roleLabel(sug)}</strong>
        </div>
      )}

      {!disabled && hasPending && (
        <div className="role-change-confirm">
          <div className="role-change-text">
            You selected <strong>{roleLabel(pendingRole)}</strong>, which is not the suggested role{" "}
            (<strong>{roleLabel(sug || "skip")}</strong>). Confirm this change?
          </div>

          <div className="role-change-actions">
            <button
              type="button"
              className="mini-btn"
              onClick={() =>
                setPendingMap?.((prev) => {
                  const copy = { ...(prev || {}) };
                  delete copy[colIndex];
                  return copy;
                })
              }
            >
              Cancel
            </button>

            <button type="button" className="mini-btn primary" onClick={() => commitNow(pendingRole)}>
              Confirm change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HighConfidenceCard({ highConfidence, columnMap, onSetRole, disabled }) {
  const [expanded, setExpanded] = useState({});
  const [pendingMap, setPendingMap] = useState({});

  if (!Array.isArray(highConfidence) || highConfidence.length === 0) return null;

  return (
    <div className="mapping-card">
      <div className="mapping-title">Auto-mapped (high confidence)</div>
      <div className="mapping-sub">Review these mappings.</div>

      {highConfidence.map((c) => {
        const current = columnMap?.[c.index] || {};
        const isOpen = !!expanded[c.index];

        return (
          <div key={c.index} className="verify-item">
            <div className="verify-head">
              <div style={{ fontWeight: 700, color: "#111827" }}>{c.name}</div>

              <button
                type="button"
                className="link-button"
                onClick={() => setExpanded((p) => ({ ...p, [c.index]: !p[c.index] }))}
              >
                {isOpen ? "Hide details" : "Show details"}
              </button>
            </div>

            <div className="mapping-row" style={{ marginTop: 10, alignItems: "flex-start" }}>
              <div className="role-label" style={{ marginTop: 8 }}>
                Role
              </div>

              <RolePickerWithConfirm
                colIndex={c.index}
                value={current.role || c.role}
                suggested={c.role}
                pendingMap={pendingMap}
                setPendingMap={setPendingMap}
                onCommitRole={(idx, role) => onSetRole(idx, role)}
                disabled={disabled}
              />
            </div>

            {isOpen && <ColumnMeta column={c} />}
          </div>
        );
      })}
    </div>
  );
}

function RequiredMissingCard({ requiredMissing, allColumnsOptions, requiredMissingMap, onPick, disabled }) {
  if (!Array.isArray(requiredMissing) || requiredMissing.length === 0) return null;

  return (
    <div className="mapping-card">
      <div className="mapping-title">Required fields missing</div>
      <div className="mapping-sub">You must map these required fields before you can confirm.</div>

      {requiredMissing.map((r) => (
        <div key={r.role} style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 600, color: "#111827", marginBottom: 6 }}>
            {r.name} (required)
          </div>

          {r.user_prompt && (
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{r.user_prompt}</div>
          )}

          <FormSelect
            label="Choose column"
            placeholder="Select a column..."
            options={allColumnsOptions}
            value={requiredMissingMap?.[r.role] || ""}
            onChange={(e) => onPick(r.role, e.target.value)}
            disabled={!!disabled}
          />
        </div>
      ))}
    </div>
  );
}

function NeedsMappingCard({ needsMapping, columnMap, onSetRole, disabled }) {
  const [pendingMap, setPendingMap] = useState({});

  if (!Array.isArray(needsMapping) || needsMapping.length === 0) return null;

  return (
    <div className="mapping-card">
      <div className="mapping-title">Needs mapping</div>
      <div className="mapping-sub">These columns need a role before you can continue.</div>

      {needsMapping.map((c) => {
        const current = columnMap?.[c.index] || {};

        return (
          <div key={c.index} style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, color: "#111827" }}>{c.name}</div>

            {c.user_prompt && (
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{c.user_prompt}</div>
            )}

            <div className="mapping-row" style={{ marginTop: 10, alignItems: "flex-start" }}>
              <div className="role-label" style={{ marginTop: 8 }}>
                Role
              </div>

              <RolePickerWithConfirm
                colIndex={c.index}
                value={current.role || "skip"}
                suggested={c.role}
                pendingMap={pendingMap}
                setPendingMap={setPendingMap}
                onCommitRole={(idx, role) => onSetRole(idx, role)}
                disabled={disabled}
              />
            </div>

            <ColumnMeta column={c} />
          </div>
        );
      })}
    </div>
  );
}

function NeedsVerificationCard({ needsVerification, columnMap, onSetRole, onConfirmVerified, disabled }) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});
  const [pendingMap, setPendingMap] = useState({});
  const pageSize = 5;

  if (!Array.isArray(needsVerification) || needsVerification.length === 0) return null;

  const total = needsVerification.length;
  const confirmed = needsVerification.filter((c) => !!columnMap?.[c.index]?.verified).length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const safeSetPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  const start = (page - 1) * pageSize;
  const pageItems = needsVerification.slice(start, start + pageSize);

  return (
    <div className="mapping-card">
      <div className="mapping-title">
        Needs verification ({confirmed}/{total} confirmed)
      </div>
      <div className="mapping-sub">Confirm the AI guess or choose a different role.</div>

      <div className="mapping-pager">
        <button className="pager-btn" onClick={() => safeSetPage(page - 1)} disabled={page === 1}>
          Prev
        </button>
        <div className="pager-page">
          Page {page} / {totalPages}
        </div>
        <button className="pager-btn" onClick={() => safeSetPage(page + 1)} disabled={page === totalPages}>
          Next
        </button>
      </div>

      <div className="mapping-list">
        {pageItems.map((c) => {
          const current = columnMap?.[c.index] || {};
          const isOpen = !!expanded[c.index];
          const hasPending = !!pendingMap?.[c.index];

          return (
            <div key={c.index} className="verify-item">
              <div className="verify-head">
                <div style={{ fontWeight: 700, color: "#111827" }}>{c.name}</div>
              </div>

              {c.user_prompt && (
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>{c.user_prompt}</div>
              )}

              <div className="mapping-row" style={{ marginTop: 10, alignItems: "flex-start" }}>
                <div className="role-label" style={{ marginTop: 8 }}>
                  Role
                </div>

                <div style={{ flex: "1 1 auto", minWidth: 260 }}>
                  <RolePickerWithConfirm
                    colIndex={c.index}
                    value={current.role || "skip"}
                    suggested={c.role}
                    pendingMap={pendingMap}
                    setPendingMap={setPendingMap}
                    onCommitRole={(idx, role) => onSetRole(idx, role)}
                    disabled={disabled}
                  />
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onConfirmVerified(c.index)}
                  disabled={disabled || !!current.verified || hasPending}
                  title={
                    disabled
                      ? "Mappings are locked for this batch."
                      : hasPending
                      ? "Confirm or cancel the role change first."
                      : ""
                  }
                  style={{ alignSelf: "flex-start" }}
                >
                  {current.verified ? "Confirmed" : "Confirm"}
                </Button>

                <button
                  type="button"
                  className="link-button"
                  onClick={() => setExpanded((p) => ({ ...p, [c.index]: !p[c.index] }))}
                  style={{ alignSelf: "flex-start", marginTop: 8 }}
                >
                  {isOpen ? "Hide details" : "Show details"}
                </button>
              </div>

              {isOpen && <ColumnMeta column={c} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SuggestedSkipCard({ suggestedSkip, columnMap, onToggleInclude, disabled }) {
  if (!Array.isArray(suggestedSkip) || suggestedSkip.length === 0) return null;

  return (
    <div className="mapping-card">
      <div className="mapping-title">Suggested to skip</div>
      <div className="mapping-sub">These columns are probably not useful.</div>

      {suggestedSkip.map((c) => {
        const current = columnMap?.[c.index] || {};
        return (
          <div key={c.index} style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, color: "#111827" }}>{c.name}</div>

            {c.reason && (
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Why skip: {c.reason}</div>
            )}

            <div className="mapping-row" style={{ marginTop: 10 }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onToggleInclude(c.index)}
                disabled={!!disabled}
                title={disabled ? "Mappings are locked for this batch." : ""}
              >
                {current.include ? "Included" : "Skipped"}
              </Button>

              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Current role: {roleLabel(current.role || "skip")}
              </div>
            </div>

            <ColumnMeta column={c} />
          </div>
        );
      })}
    </div>
  );
}

export default function MappingStep({
  analysisLoading,
  analysis,
  allColumnsOptions,
  columnMap,
  requiredMissingMap,

  alreadyConfirmed,

  onBack,
  onSetRole,
  onConfirmVerified,
  onToggleInclude,
  onPickRequiredMissing,

  canConfirm,
  onConfirm,

  confirming,
}) {
  if (analysisLoading) return <MappingStepSkeleton />;
  if (!analysis) return <InfoMessage type="info">No analysis data yet.</InfoMessage>;

  const highConfidence = analysis?.classified?.high_confidence || [];
  const requiredMissing = analysis?.classified?.required_missing || [];
  const needsVerification = analysis?.classified?.needs_verification || [];
  const needsMapping = analysis?.classified?.needs_mapping || [];
  const suggestedSkip = analysis?.classified?.suggested_skip || [];

  const hasAnything =
    highConfidence.length ||
    requiredMissing.length ||
    needsVerification.length ||
    needsMapping.length ||
    suggestedSkip.length;

  return (
    <>
      {!hasAnything && <InfoMessage type="info">No columns to map.</InfoMessage>}

      <div className="mapping-section">
        <HighConfidenceCard
          highConfidence={highConfidence}
          columnMap={columnMap}
          onSetRole={onSetRole}
          disabled={alreadyConfirmed}
        />

        <RequiredMissingCard
          requiredMissing={requiredMissing}
          allColumnsOptions={allColumnsOptions}
          requiredMissingMap={requiredMissingMap}
          onPick={onPickRequiredMissing}
          disabled={alreadyConfirmed}
        />

        <NeedsMappingCard
          needsMapping={needsMapping}
          columnMap={columnMap}
          onSetRole={onSetRole}
          disabled={alreadyConfirmed}
        />

        <NeedsVerificationCard
          needsVerification={needsVerification}
          columnMap={columnMap}
          onSetRole={onSetRole}
          onConfirmVerified={onConfirmVerified}
          disabled={alreadyConfirmed}
        />

        <SuggestedSkipCard
          suggestedSkip={suggestedSkip}
          columnMap={columnMap}
          onToggleInclude={onToggleInclude}
          disabled={alreadyConfirmed}
        />
      </div>

      <FormActions>
        <Button variant="secondary" onClick={onBack} disabled={!!confirming}>
          Back
        </Button>

        <Button
          variant="primary"
          onClick={onConfirm}
          disabled={(!canConfirm && !alreadyConfirmed) || !!confirming}
        >
          {alreadyConfirmed ? "Continue" : confirming ? "Confirming..." : "Confirm mappings"}
        </Button>
      </FormActions>

      {!alreadyConfirmed && !canConfirm && (
        <div style={{ marginTop: 12 }}>
          <InfoMessage type="info">
            Please resolve required missing fields and confirm all “Needs verification” columns.
          </InfoMessage>
        </div>
      )}
    </>
  );
}
