// frontend/src/features/events/components/EventForm.jsx
import { useMemo, useState } from "react";
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

const TYPE_OPTIONS = [
  { value: "religious", label: "Religious" },
  { value: "national", label: "National" },
  { value: "seasonal", label: "Seasonal" },
  { value: "local", label: "Local" },
  { value: "business", label: "Business" },
  { value: "promotional", label: "Promotional" },
  { value: "custom", label: "Custom" },
];

const RECURRENCE_OPTIONS = [
  { value: "yearly", label: "Yearly" },
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
];

export default function EventForm({ saving, onSavingChange, onSuccess, onError }) {
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
      if (!res?.success) throw new Error(res?.message || "Request failed.");
      onSuccess?.(res?.message || "Event created successfully.");
    } catch (ex) {
      onError?.(ex?.message || "Failed to create event.");
    } finally {
      onSavingChange?.(false);
    }
  }

  return (
    <form onSubmit={submit} className="events-form">
      {localError && <InfoMessage type="error">{localError}</InfoMessage>}

      <FormRow columns={2}>
        <FormInput
          label="Event Name (English)"
          placeholder="Ramadan 2025"
          value={form.event_name}
          onChange={set("event_name")}
          required
        />

        <FormInput
          label="Event Name (Arabic)"
          placeholder="رمضان 2025"
          value={form.event_name_ar}
          onChange={set("event_name_ar")}
        />
      </FormRow>

      <FormRow columns={2}>
        <FormSelect
          label="Event Type"
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
            <span>Recurring</span>
          </label>

          <div className={`recurrence-wrap ${form.is_recurring ? "" : "disabled"}`}>
            <FormSelect
              label="Recurrence Type"
              value={form.recurrence_type || ""}
              onChange={set("recurrence_type")}
              options={RECURRENCE_OPTIONS}
              placeholder="Select recurrence"
              disabled={!form.is_recurring}
            />
          </div>
        </div>
      </FormRow>

      <FormRow columns={2}>
        <FormCalendar
          label="Start Date"
          value={form.start_date}
          onChange={set("start_date")}
          required
        />
        <FormCalendar
          label="End Date"
          value={form.end_date}
          onChange={set("end_date")}
          required
          min={form.start_date}
        />
      </FormRow>

      <FormTextarea
        label="Description"
        placeholder="Major religious event, expect high demand..."
        value={form.description}
        onChange={set("description")}
        rows={4}
      />

      <FormActions align="right">
        <Button type="submit" disabled={!!saving}>
          {saving ? "Creating..." : "Create Event"}
        </Button>
      </FormActions>
    </form>
  );
}