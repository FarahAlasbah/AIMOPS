import { useState } from "react";

import { useAuth } from "../../../shared/contexts/AuthContext";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MIN_LOADING_MS = 600;

export function useLoginForm(t) {
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const validateField = (name, value) => {
    const trimmedValue = (value ?? "").trim();

    if (name === "username" && !trimmedValue) {
      return t("login.usernameRequired");
    }

    if (name === "password" && !trimmedValue) {
      return t("login.passwordRequired");
    }

    return "";
  };

  const validateForm = () => {
    const nextErrors = {
      username: validateField("username", formData.username),
      password: validateField("password", formData.password),
    };

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key]) {
        delete nextErrors[key];
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => {
      if (!previous[name]) return previous;

      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;

    setTouched((previous) => ({
      ...previous,
      [name]: true,
    }));

    const message = validateField(name, value);

    setErrors((previous) => {
      const next = { ...previous };

      if (message) {
        next[name] = message;
      } else {
        delete next[name];
      }

      return next;
    });
  };

  const showErr = (name) => {
    if (!submitted && !touched[name]) return "";
    return errors[name] || "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitted(true);
    setApiError("");

    if (!validateForm()) return;

    setIsLoading(true);
    const startedAt = Date.now();

    try {
      await login({
        username: formData.username.trim(),
        password: formData.password,
      });
    } catch (error) {
      const elapsed = Date.now() - startedAt;

      if (elapsed < MIN_LOADING_MS) {
        await sleep(MIN_LOADING_MS - elapsed);
      }

      if (error?.fieldErrors) {
        setErrors((previous) => ({
          ...previous,
          ...error.fieldErrors,
        }));
      }

      setApiError(error?.message || t("login.errorInvalidCredentials"));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formData,
    showPassword,
    rememberMe,
    isLoading,
    apiError,

    setShowPassword,
    setRememberMe,
    setApiError,

    handleChange,
    handleBlur,
    handleSubmit,
    showErr,
  };
}