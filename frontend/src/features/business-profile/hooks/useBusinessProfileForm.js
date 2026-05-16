import { useEffect, useMemo, useState } from "react";

import {
  CITY_OPTIONS,
  INDUSTRY_OPTIONS,
} from "../data/businessProfileOptions";

import {
  EMPTY_FORM,
  getMatches,
  getPickedValue,
  normalizeForm,
} from "../utils/businessProfileFormUtils";

export function useBusinessProfileForm({
  profile,
  hasProfile,
  persistProfile,
  canEditBusinessProfile,
  t,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [successMessage, setSuccessMessage] = useState("");
  const [focusedSuggestField, setFocusedSuggestField] = useState("");
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  useEffect(() => {
    setForm(normalizeForm(profile));
  }, [profile]);

  const industrySuggestions = useMemo(
    () => getMatches(form.industry, INDUSTRY_OPTIONS),
    [form.industry],
  );

  const citySuggestions = useMemo(
    () => getMatches(form.city, CITY_OPTIONS),
    [form.city],
  );

  const showIndustrySuggestions =
    canEditBusinessProfile &&
    focusedSuggestField === "industry" &&
    industrySuggestions.length > 0;

  const showCitySuggestions =
    canEditBusinessProfile &&
    focusedSuggestField === "city" &&
    citySuggestions.length > 0;

  const isValid = useMemo(() => {
    return (
      form.business_name.trim().length > 0 &&
      form.industry.trim().length > 0 &&
      form.city.trim().length > 0
    );
  }, [form]);

  const clearSuccessMessage = () => {
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const handleChange = (event) => {
    if (!canEditBusinessProfile) return;

    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFocusedSuggestField(name);
    setActiveSuggestionIndex(0);
    clearSuccessMessage();
  };

  const handleSuggestionPick = (fieldName, option) => {
    if (!canEditBusinessProfile || !option) return;

    setForm((current) => ({
      ...current,
      [fieldName]: getPickedValue(option, current[fieldName]),
    }));

    setFocusedSuggestField("");
    setActiveSuggestionIndex(-1);
    clearSuccessMessage();
  };

  const handleSuggestionFocus = (fieldName) => {
    if (!canEditBusinessProfile) return;

    setFocusedSuggestField(fieldName);
    setActiveSuggestionIndex(0);
  };

  const handleSuggestionBlur = () => {
    window.setTimeout(() => {
      setFocusedSuggestField("");
      setActiveSuggestionIndex(-1);
    }, 120);
  };

  const handleSuggestionKeyDown = (fieldName, suggestions) => (event) => {
    if (!canEditBusinessProfile || !suggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setFocusedSuggestField(fieldName);
      setActiveSuggestionIndex((current) => {
        if (current < 0) return 0;
        return (current + 1) % suggestions.length;
      });
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setFocusedSuggestField(fieldName);
      setActiveSuggestionIndex((current) => {
        if (current < 0) return suggestions.length - 1;
        return (current - 1 + suggestions.length) % suggestions.length;
      });
    }

    if (event.key === "Enter") {
      if (focusedSuggestField !== fieldName) return;

      const selected =
        suggestions[activeSuggestionIndex] || suggestions[0] || null;

      if (!selected) return;

      event.preventDefault();
      handleSuggestionPick(fieldName, selected);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setFocusedSuggestField("");
      setActiveSuggestionIndex(-1);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canEditBusinessProfile) return;

    const wasExisting = hasProfile;
    const result = await persistProfile(form);

    if (result.success) {
      setSuccessMessage(
        wasExisting ? t("page.updatedSuccess") : t("page.createdSuccess"),
      );
    }
  };

  return {
    form,
    successMessage,

    industrySuggestions,
    citySuggestions,
    showIndustrySuggestions,
    showCitySuggestions,

    activeSuggestionIndex,

    isValid,

    handleChange,
    handleSuggestionPick,
    handleSuggestionFocus,
    handleSuggestionBlur,
    handleSuggestionKeyDown,
    handleSubmit,
  };
}