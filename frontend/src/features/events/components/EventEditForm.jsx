// frontend/src/features/events/components/EventEditForm.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  FormActions,
  FormCalendar,
  FormInput,
  FormRow,
  FormSelect,
  FormTextarea,
  InfoMessage,
} from "../../../shared/components";
import { updateEvent } from "../../../api/events";
import { toIsoDate, validateEventPayload } from "../utils/eventUtils";
import "./EventForm.css";

export default function EventEditForm({
  eventId,
  initialEvent,
  saving,
  onSavingChange,
  onCancel,
  onSuccess,
  onError,
}) {
  const { t } = useTranslation("events");

  const TYPE_OPTIONS = [
    { value: "religious", label: t("form.types.religious") },
    { value: "national", label: t("form.types.national") },
    { value: "seasonal", label: t("form.types.seasonal") },
    { value: "local", label: t("form.types.local") },
    { value: "business", label: t("form.types.business") },
    { value: "promotional", label: t("form.types.promotional") },
    { value: "custom", label: t("form.types.custom") },
  ];

  const RECURRENCE_OPTIONS = [
    { value: "yearly", label: t("form.recurrenceOptions.yearly") },
    { value: "monthly", label: t("form.recurrenceOptions.monthly") },
    { value: "weekly", label: t("form.recurrenceOptions.weekly") },
  ];

  const [localError, setLocalError] = useState("");

  const [form, setForm] = useState(() => ({
    event_name: "",
    event_name_ar: "",
    event_type: "religious",
    start_date: toIsoDate(new Date()),
    end_date: toIsoDate(new Date()),
    description: "",
    is_recurring: false,
    recurrence_type: "yearly",
  }));

  useEffect(() => {
    if (!initialEvent) return;

    setForm({
      event_name: initialEvent.event_name || "",
      event_name_ar: initialEvent.event_name_ar || "",
      event_type: initialEvent.event_type || "religious",
      start_date: initialEvent.start_date || toIsoDate(new Date()),
      end_date: initialEvent.end_date || toIsoDate(new Date()),
      description: initialEvent.description || "",
      is_recurring: !!initialEvent.is_recurring,
      recurrence_type: initialEvent.recurrence_type || "yearly",
    });
  }, [initialEvent]);

  const payload = useMemo(() => {
    const p = { ...form };
    if (!p.is_recurring) p.recurrence_type = null;
    return p;
  }, [form]);

  const set = (k) => (e) => {
    const v = e?.target?.type === "checkbox" ? e.target.checked : e?.target?.value;
    setForm((s) => ({ ...s, [k]: v }));
  };

  async function submit(e) {
    e.preventDefault();
    setLocalError("");

    const err = validateEventPayload(payload);
    if (err) {
      setLocalError(err);
      return;
    }

    onSavingChange?.(true);
    try {
      const res = await updateEvent(eventId, payload);
      if (!res?.success) throw new Error(res?.message || t("eventEditForm.errorUpdateFailed"));
      onSuccess?.(res);
    } catch (ex) {
      onError?.(ex?.message || t("eventEditForm.errorUpdateApiFailed"));
    } finally {
      onSavingChange?.(false);
    }
  }

  return (
    <form onSubmit={submit} className="events-form">
      {localError && <InfoMessage type="error">{localError}</InfoMessage>}

      <FormRow columns={2}>
        <FormInput
          label={t("form.eventNameEn")}
          placeholder={t("eventEditForm.eventNameEnPlaceholder")}
          value={form.event_name}
          onChange={set("event_name")}
          required
        />

        <FormInput
          label={t("form.eventNameAr")}
          placeholder={t("eventEditForm.eventNameArPlaceholder")}
          value={form.event_name_ar}
          onChange={set("event_name_ar")}
        />
      </FormRow>

      <FormRow columns={2}>
        <FormSelect
          label={t("form.eventType")}
          value={form.event_type}
          onChange={set("event_type")}
          options={TYPE_OPTIONS}
          required
        />

        <div className="events-checkbox">
          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={!!form.is_recurring}
              onChange={set("is_recurring")}
            />
            <span>{t("form.recurring")}</span>
          </label>

          <div className={`recurrence-wrap ${form.is_recurring ? "" : "disabled"}`}>
            <FormSelect
              label={t("form.recurrenceType")}
              value={form.recurrence_type || ""}
              onChange={set("recurrence_type")}
              options={RECURRENCE_OPTIONS}
              placeholder={t("form.recurrencePlaceholder")}
              disabled={!form.is_recurring}
            />
          </div>
        </div>
      </FormRow>

      <FormRow columns={2}>
        <FormCalendar
          label={t("form.startDate")}
          value={form.start_date}
          onChange={set("start_date")}
          required
        />
        <FormCalendar
          label={t("form.endDate")}
          value={form.end_date}
          onChange={set("end_date")}
          required
          min={form.start_date}
        />
      </FormRow>

      <FormTextarea
        label={t("form.description")}
        placeholder={t("eventEditForm.descriptionPlaceholder")}
        value={form.description}
        onChange={set("description")}
        rows={4}
      />

      <FormActions align="between">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={!!saving}>
          {t("eventEditForm.cancel")}
        </Button>

        <Button type="submit" disabled={!!saving}>
          {saving ? t("eventEditForm.saving") : t("eventEditForm.saveChanges")}
        </Button>
      </FormActions>
    </form>
  );
}