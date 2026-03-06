// frontend/src/features/events/components/EventForm.jsx
import { useMemo, useState } from "react";
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
import { createEvent } from "../../../api/events";
import { toIsoDate, validateEventPayload } from "../utils/eventUtils";
import "./EventForm.css";

export default function EventForm({ saving, onSavingChange, onSuccess, onError }) {
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

  const [form, setForm] = useState(() => ({
    event_name: "",
    event_name_ar: "",
    event_type: "religious",
    start_date: toIsoDate(new Date()),
    end_date: toIsoDate(new Date()),
    description: "",
    is_recurring: true,
    recurrence_type: "yearly",
  }));

  const [localError, setLocalError] = useState("");

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
      const res = await createEvent(payload);
      if (!res?.success) throw new Error(res?.message || t("eventForm.errorCreateFailed"));
      onSuccess?.(res?.message || t("eventForm.createEvent"));
    } catch (ex) {
      onError?.(ex?.message || t("eventForm.errorCreateApiFailed"));
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
          placeholder={t("form.eventNameEnPlaceholder")}
          value={form.event_name}
          onChange={set("event_name")}
          required
        />

        <FormInput
          label={t("form.eventNameAr")}
          placeholder={t("form.eventNameArPlaceholder")}
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
        placeholder={t("eventForm.descriptionPlaceholder")}
        value={form.description}
        onChange={set("description")}
        rows={4}
      />

      <FormActions align="right">
        <Button type="submit" disabled={!!saving}>
          {saving ? t("eventForm.creating") : t("eventForm.createEvent")}
        </Button>
      </FormActions>
    </form>
  );
}