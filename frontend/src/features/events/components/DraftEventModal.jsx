// frontend/src/features/events/components/DraftEventModal.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  FormCalendar,
  FormInput,
  FormRow,
  FormSelect,
} from "../../../shared/components";
import InfoMessage from "../../../shared/components/InfoMessage";
import { confirmDraftEvent, dismissDraftEvent } from "../../../api/events";
import { toIsoDate } from "../utils/eventUtils";
import "./DraftEventModal.css";

const TYPE_OPTIONS_KEYS = [
  "religious", "national", "seasonal", "local", "business", "promotional", "custom",
];
const RECURRENCE_OPTIONS_KEYS = ["yearly", "monthly", "weekly"];

const fmtPct = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
};
const fmtNum = (v, d = 1) => {
  const n = Number(v);
  return Number.isNaN(n) ? "—" : n.toFixed(d);
};

const IMPACT_META = {
  very_high: { label: "Very High", cls: "imp-veryhigh" },
  high:      { label: "High",      cls: "imp-high"     },
  medium:    { label: "Medium",    cls: "imp-medium"   },
  low:       { label: "Low",       cls: "imp-low"      },
};
const impactMeta = (level) =>
  IMPACT_META[String(level || "").toLowerCase()] ||
  { label: level || "—", cls: "imp-low" };

// ── Impact panel (left column) ────────────────────────────────────────────────
function ImpactPanel({ event }) {
  const { t } = useTranslation("events");
  const impacts = Array.isArray(event?.impacts) ? event.impacts : [];

  return (
    <div className="dem-impact-panel">
      <div className="dem-panel-head">
        <div className="dem-panel-title">{t("draftModal.impactTitle")}</div>
        <div className="dem-panel-sub">
          {event.start_date} – {event.end_date}
          {event.duration_days ? ` · ${event.duration_days}d` : ""}
        </div>
      </div>

      {event.description && (
        <div className="dem-description">{event.description}</div>
      )}

      <div className="dem-impacts-list">
        {impacts.map((imp) => {
          const meta = impactMeta(imp.impact_level);
          return (
            <div key={`${imp.product_id}`} className="dem-impact-item">
              <div className="dem-impact-top">
                <span className="dem-impact-name">{imp.product_name}</span>
                <span className={`dem-impact-badge ${meta.cls}`}>{meta.label}</span>
              </div>
              <div className="dem-impact-bar-wrap">
                <div
                  className="dem-impact-bar"
                  style={{
                    width: `${Math.min(100, Math.abs(imp.change_percentage || 0) / 5)}%`,
                  }}
                />
              </div>
              <div className="dem-impact-nums">
                <span className="dem-impact-pct">{fmtPct(imp.change_percentage)}</span>
                <span className="dem-impact-detail">
                  {fmtNum(imp.during_daily_avg)} {t("draftModal.vsLabel")} {fmtNum(imp.baseline_daily_avg)} {t("draftModal.unitsDay")}
                </span>
              </div>
            </div>
          );
        })}
        {impacts.length === 0 && (
          <div className="dem-no-impacts">{t("draftModal.noImpacts")}</div>
        )}
      </div>
    </div>
  );
}

// ── Confirm form (right column) ───────────────────────────────────────────────
function ConfirmForm({ event, onClose, onConfirmed, onDismissed }) {
  const { t } = useTranslation("events");

  const TYPE_OPTIONS      = TYPE_OPTIONS_KEYS.map((v)      => ({ value: v, label: t(`form.types.${v}`) }));
  const RECURRENCE_OPTIONS = RECURRENCE_OPTIONS_KEYS.map((v) => ({ value: v, label: t(`form.recurrenceOptions.${v}`) }));

  const defaults = event?.confirm_form_defaults || {};

  const [form, setForm] = useState({
    event_name:      defaults.event_name      ?? "",
    event_type:      defaults.event_type      ?? "promotional",
    start_date:      defaults.start_date      ?? toIsoDate(new Date()),
    end_date:        defaults.end_date        ?? toIsoDate(new Date()),
    is_recurring:    defaults.is_recurring    ?? false,
    recurrence_type: defaults.recurrence_type ?? "yearly",
  });

  const [submitting, setSubmitting] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [error,      setError]      = useState("");
  const [done,       setDone]       = useState(null);

  const set = (k) => (e) => {
    const v = e?.target?.type === "checkbox" ? e.target.checked : e?.target?.value;
    setForm((s) => ({ ...s, [k]: v }));
  };

  const handleConfirm = async () => {
    setError("");
    if (!form.event_name?.trim()) { setError(t("draftModal.errorNameRequired")); return; }
    try {
      setSubmitting(true);
      const res = await confirmDraftEvent(event.event_id, {
        event_name:      form.event_name.trim(),
        event_type:      form.event_type,
        start_date:      form.start_date,
        end_date:        form.end_date,
        is_recurring:    form.is_recurring,
        recurrence_type: form.is_recurring ? form.recurrence_type : null,
      });
      setDone("confirmed");
      setTimeout(() => onConfirmed?.(res, event), 900);
    } catch (err) {
      setError(
        err?.response?.data?.detail?.message ||
        err?.response?.data?.message ||
        err?.message ||
        t("draftModal.errorConfirmFailed"),
      );
    } finally { setSubmitting(false); }
  };

  const handleDismiss = async () => {
    setError("");
    try {
      setDismissing(true);
      const res = await dismissDraftEvent(event.event_id);
      setDone("dismissed");
      setTimeout(() => onDismissed?.(res, event), 900);
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || t("draftModal.errorDismissFailed"),
      );
    } finally { setDismissing(false); }
  };

  const busy = submitting || dismissing;

  if (done === "confirmed") return (
    <div className="dem-form-panel dem-done-panel">
      <div className="dem-done-icon dem-done-ok">✓</div>
      <div className="dem-done-msg">{t("draftModal.confirmedSuccess")}</div>
    </div>
  );

  if (done === "dismissed") return (
    <div className="dem-form-panel dem-done-panel">
      <div className="dem-done-icon dem-done-muted">–</div>
      <div className="dem-done-msg dem-done-muted-msg">{t("draftModal.dismissedInfo")}</div>
    </div>
  );

  return (
    <div className="dem-form-panel">
      <div className="dem-panel-head">
        <div className="dem-panel-title">{t("draftModal.formTitle")}</div>
        <div className="dem-panel-sub">{t("draftModal.formSub")}</div>
      </div>

      {error && <div className="dem-error"><InfoMessage type="error">{error}</InfoMessage></div>}

      <div className="dem-fields">
        <FormInput
          label={t("draftModal.labelEventName")}
          placeholder={t("draftModal.placeholderEventName")}
          value={form.event_name}
          onChange={set("event_name")}
          required
          disabled={busy}
        />

        <FormSelect
          label={t("form.eventType")}
          value={form.event_type}
          onChange={set("event_type")}
          options={TYPE_OPTIONS}
          disabled={busy}
        />

        <FormRow columns={2}>
          <FormCalendar
            label={t("form.startDate")}
            value={form.start_date}
            onChange={set("start_date")}
            disabled={busy}
          />
          <FormCalendar
            label={t("form.endDate")}
            value={form.end_date}
            onChange={set("end_date")}
            min={form.start_date}
            disabled={busy}
          />
        </FormRow>

        <label className="dem-checkbox-row">
          <input
            type="checkbox"
            checked={!!form.is_recurring}
            onChange={set("is_recurring")}
            disabled={busy}
          />
          <span>{t("form.recurring")}</span>
        </label>

        {form.is_recurring && (
          <FormSelect
            label={t("form.recurrenceType")}
            value={form.recurrence_type || ""}
            onChange={set("recurrence_type")}
            options={RECURRENCE_OPTIONS}
            disabled={busy}
          />
        )}
      </div>

      <div className="dem-form-actions">
        <button
          type="button"
          className="dem-dismiss-btn"
          onClick={handleDismiss}
          disabled={busy}
        >
          {dismissing ? t("draftModal.dismissing") : t("draftModal.dismiss")}
        </button>

        <Button type="button" onClick={handleConfirm} disabled={busy}>
          {submitting ? t("draftModal.confirming") : t("draftModal.confirm")}
        </Button>
      </div>
    </div>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
export default function DraftEventModal({ event, onClose, onConfirmed, onDismissed }) {
  const { t } = useTranslation("events");

  useEffect(() => {
    if (!event) return;
    const handler = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [event, onClose]);

  if (!event) return null;

  return (
    <div
      className="dem-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="dem-modal">

        {/* ── Top bar ── */}
        <div className="dem-topbar">
          <div className="dem-topbar-left">
            <span className="dem-topbar-badge">{t("draftModal.badge")}</span>
            <span className="dem-topbar-label">{t("draftModal.topbarLabel")}</span>
          </div>
          <button
            type="button"
            className="dem-close-btn"
            onClick={onClose}
            aria-label={t("draftModal.close")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Two-column body ── */}
        <div className="dem-body">
          <ImpactPanel event={event} />
          <div className="dem-divider" />
          <ConfirmForm
            event={event}
            onClose={onClose}
            onConfirmed={onConfirmed}
            onDismissed={onDismissed}
          />
        </div>

      </div>
    </div>
  );
}