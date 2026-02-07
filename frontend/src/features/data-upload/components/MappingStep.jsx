// frontend/src/features/data-upload/components/MappingStep.jsx
import { useMemo, useState } from "react";
import { Button, FormActions, FormSelect } from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";
import ColumnMeta from "./ColumnMeta";
import { ROLE_DEFS, normalizeRole, roleLabel } from "../utils/analysisUtils";

function RolePills({ value, suggested, onChange }) {
  const current = normalizeRole(value);
  const sug = normalizeRole(suggested);

  const showSuggested = sug && sug !== "skip" && sug !== current;

  return (
    <div className="role-picker">
      {showSuggested && (
        <div className="role-suggest">
          Suggested: <strong>{roleLabel(sug)}</strong>
        </div>
      )}

      <div className="role-pills">
        {ROLE_DEFS.map((r) => {
          const active = current === r.value;
          const isSkip = r.value === "skip";
          return (
            <button
              key={r.value}
              type="button"
              className={`role-pill ${active ? "active" : ""} ${isSkip ? "skip" : ""}`}
              onClick={() => onChange(r.value)}
              aria-pressed={active}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HighConfidenceCard({ highConfidence, columnMap, onSetRole }) {
  const [expanded, setExpanded] = useState({});

  if (!Array.isArray(highConfidence) || highConfidence.length === 0) return null;

  return (
    <div className="mapping-card">
      <div className="mapping-title">Auto-mapped (high confidence)</div>
      <div className="mapping-sub">Review these mappings (you can still change roles).</div>

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

            <div className="mapping-row" style={{ marginTop: 10 }}>
              <div className="role-label">Role</div>
              <RolePills
                value={current.role || c.role}
                suggested={c.role}
                onChange={(role) => onSetRole(c.index, role)}
              />
            </div>

            {isOpen && <ColumnMeta column={c} />}
          </div>
        );
      })}
    </div>
  );
}

function RequiredMissingCard({ requiredMissing, allColumnsOptions, requiredMissingMap, onPick }) {
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
          />
        </div>
      ))}
    </div>
  );
}

function NeedsMappingCard({ needsMapping, columnMap, onSetRole }) {
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

            <div className="mapping-row" style={{ marginTop: 10 }}>
              <div className="role-label">Role</div>
              <RolePills
                value={current.role || "skip"}
                suggested={c.role}
                onChange={(role) => onSetRole(c.index, role)}
              />
            </div>

            <ColumnMeta column={c} />
          </div>
        );
      })}
    </div>
  );
}

function NeedsVerificationCard({ needsVerification, columnMap, onSetRole, onConfirmVerified }) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});
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

          const suggested = normalizeRole(c.role); // employee_id -> skip (hidden as suggested)
          const showSuggested = suggested !== "skip" ? roleLabel(suggested) : "";

          return (
            <div key={c.index} className="verify-item">
              <div className="verify-head">
                <div style={{ fontWeight: 700, color: "#111827" }}>{c.name}</div>
                {showSuggested ? (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Suggested role: {showSuggested}</div>
                ) : null}
              </div>

              {c.user_prompt && (
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>{c.user_prompt}</div>
              )}

              <div className="mapping-row" style={{ marginTop: 10 }}>
                <div className="role-label">Role</div>
                <RolePills
                  value={current.role || "skip"}
                  suggested={c.role}
                  onChange={(role) => onSetRole(c.index, role)}
                />

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onConfirmVerified(c.index)}
                  disabled={!!current.verified}
                >
                  {current.verified ? "Confirmed" : "Confirm"}
                </Button>

                <button
                  type="button"
                  className="link-button"
                  onClick={() => setExpanded((p) => ({ ...p, [c.index]: !p[c.index] }))}
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

function SuggestedSkipCard({ suggestedSkip, columnMap, onToggleInclude }) {
  if (!Array.isArray(suggestedSkip) || suggestedSkip.length === 0) return null;

  return (
    <div className="mapping-card">
      <div className="mapping-title">Suggested to skip</div>
      <div className="mapping-sub">
        These columns are probably not useful. You can still include them if you want.
      </div>

      {suggestedSkip.map((c) => {
        const current = columnMap?.[c.index] || {};
        return (
          <div key={c.index} style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, color: "#111827" }}>{c.name}</div>

            {c.reason && (
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Why skip: {c.reason}</div>
            )}

            <div className="mapping-row" style={{ marginTop: 10 }}>
              <Button type="button" variant="secondary" onClick={() => onToggleInclude(c.index)}>
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

  onBack,
  onSetRole,
  onConfirmVerified,
  onToggleInclude,
  onPickRequiredMissing,

  canConfirm,
  onConfirm,

  confirming,
}) {
  if (analysisLoading) return <InfoMessage type="info">Analyzing file...</InfoMessage>;
  if (!analysis) return <InfoMessage type="info">No analysis data yet.</InfoMessage>;

  const highConfidence = analysis?.classified?.high_confidence || [];
  const requiredMissing = analysis?.classified?.required_missing || [];
  const needsVerification = analysis?.classified?.needs_verification || [];
  const needsMapping = analysis?.classified?.needs_mapping || [];
  const suggestedSkip = analysis?.classified?.suggested_skip || [];

  const hasAnything =
    highConfidence.length || requiredMissing.length || needsVerification.length || needsMapping.length || suggestedSkip.length;

  return (
    <>
      {!hasAnything && <InfoMessage type="info">No columns to map.</InfoMessage>}

      <div className="mapping-section">
        <HighConfidenceCard highConfidence={highConfidence} columnMap={columnMap} onSetRole={onSetRole} />

        <RequiredMissingCard
          requiredMissing={requiredMissing}
          allColumnsOptions={allColumnsOptions}
          requiredMissingMap={requiredMissingMap}
          onPick={onPickRequiredMissing}
        />

        <NeedsMappingCard needsMapping={needsMapping} columnMap={columnMap} onSetRole={onSetRole} />

        <NeedsVerificationCard
          needsVerification={needsVerification}
          columnMap={columnMap}
          onSetRole={onSetRole}
          onConfirmVerified={onConfirmVerified}
        />

        <SuggestedSkipCard suggestedSkip={suggestedSkip} columnMap={columnMap} onToggleInclude={onToggleInclude} />
      </div>

      <FormActions>
        <Button variant="secondary" onClick={onBack} disabled={!!confirming}>
          Back
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={!canConfirm || !!confirming}>
          {confirming ? "Confirming..." : "Confirm mappings"}
        </Button>
      </FormActions>

      {!canConfirm && (
        <div style={{ marginTop: 12 }}>
          <InfoMessage type="info">
            Please resolve required missing fields and confirm all “Needs verification” columns.
          </InfoMessage>
        </div>
      )}
    </>
  );
}
