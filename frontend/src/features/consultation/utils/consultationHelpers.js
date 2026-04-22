export function getLocaleFromLanguage(language) {
  return String(language || "").toLowerCase().startsWith("ar") ? "ar" : "en";
}

export function formatConsultationDateTime(value, language = "en") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  try {
    return date.toLocaleString(getLocaleFromLanguage(language), {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return date.toLocaleString();
  }
}

export function buildConsultationSummaryTitle(baseLabel = "Consultation Summary") {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${baseLabel} - ${yyyy}-${mm}-${dd}`;
}

export function clampTextareaHeight(textarea, minHeight = 52, maxHeight = 160) {
  if (!textarea) return;
  textarea.style.height = "auto";
  const nextHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
}
