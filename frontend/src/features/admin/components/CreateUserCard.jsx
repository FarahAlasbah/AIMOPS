import { useState } from "react";
import {
  Card,
  Button,
  FormActions,
  InfoMessage,
  FormSelect,
} from "../../../shared/components";
import { useTranslation } from "react-i18next";

const defaultForm = {
  username: "",
  email: "",
  password: "",
  full_name: "",
  role_id: 2,
};

const fieldAliases = {
  username: ["username", "user_name"],
  email: ["email"],
  password: ["password", "new_password"],
  full_name: ["full_name", "fullName", "name"],
  role_id: ["role_id", "role", "roleId"],
};

const getMergedFieldError = (field, localErrors, backendErrors) => {
  if (localErrors[field]) return localErrors[field];

  const aliases = fieldAliases[field] || [field];
  return aliases.map((key) => backendErrors?.[key]).find(Boolean) || "";
};

const normalizeCreatePayload = (formData) => ({
  username: String(formData.username || "").trim(),
  email: String(formData.email || "").trim(),
  password: String(formData.password || ""),
  full_name: String(formData.full_name || "").trim(),
  role_id: Number(formData.role_id),
});

const CreateUserCard = ({
  apiError,
  fieldErrors = {},
  onCancel,
  onCreate,
  isSubmitting,
  onClearError,
}) => {
  const { t } = useTranslation("admin");

  const [formData, setFormData] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  const roleOptions = [
    {
      value: "2",
      label: t("createUser.roles.marketing", {
        defaultValue: "Marketing User",
      }),
    },
    {
      value: "3",
      label: t("createUser.roles.owner", {
        defaultValue: "Business Owner",
      }),
    },
  ];

  const clearFieldError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;

      const next = { ...prev };
      delete next[field];
      return next;
    });

    onClearError?.();
  };

  const handleChange = (field) => (event) => {
    let value = event.target.value;
    if (field === "role_id") value = Number(value);

    setFormData((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  const validateForm = () => {
    const payload = normalizeCreatePayload(formData);
    const newErrors = {};

    if (!payload.username) {
      newErrors.username = t("createUser.errors.usernameRequired", {
        defaultValue: "Username is required.",
      });
    } else if (payload.username.length < 3) {
      newErrors.username = t("createUser.errors.usernameMin", {
        defaultValue: "Username must be at least 3 characters.",
      });
    }

    if (!payload.email) {
      newErrors.email = t("createUser.errors.emailRequired", {
        defaultValue: "Email is required.",
      });
    } else if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
      newErrors.email = t("createUser.errors.emailInvalid", {
        defaultValue: "Enter a valid email address.",
      });
    }

    if (!payload.full_name) {
      newErrors.full_name = t("createUser.errors.fullNameRequired", {
        defaultValue: "Full name is required.",
      });
    }

    if (!payload.password) {
      newErrors.password = t("createUser.errors.passwordRequired", {
        defaultValue: "Password is required.",
      });
    } else if (payload.password.length < 8) {
      newErrors.password = t("createUser.errors.passwordMin", {
        defaultValue: "Password must be at least 8 characters.",
      });
    }

    if (![2, 3].includes(payload.role_id)) {
      newErrors.role_id = t("createUser.errors.roleInvalid", {
        defaultValue: "Choose a valid role.",
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    try {
      await onCreate(normalizeCreatePayload(formData));

      setFormData(defaultForm);
      setErrors({});
    } catch {
      // The parent hook already stores and displays the API error.
    }
  };

  const cancel = () => {
    setFormData(defaultForm);
    setErrors({});
    onClearError?.();
    onCancel();
  };

  const usernameError = getMergedFieldError("username", errors, fieldErrors);
  const emailError = getMergedFieldError("email", errors, fieldErrors);
  const fullNameError = getMergedFieldError("full_name", errors, fieldErrors);
  const passwordError = getMergedFieldError("password", errors, fieldErrors);
  const roleError = getMergedFieldError("role_id", errors, fieldErrors);

  return (
    <Card
      title={t("createUser.title", {
        defaultValue: "Create new user",
      })}
    >
      {apiError && (
        <div className="api-error-inline" aria-live="polite">
          <InfoMessage type="error">{apiError}</InfoMessage>
        </div>
      )}

      <form onSubmit={submit} autoComplete="on" noValidate>
        <div className="form-group">
          <label htmlFor="create-username" className="form-label">
            {t("createUser.labels.username", {
              defaultValue: "Username",
            })}{" "}
            <span className="required-mark">*</span>
          </label>

          <input
            type="text"
            id="create-username"
            name="username"
            autoComplete="username"
            className={`field-input ${usernameError ? "error" : ""}`}
            placeholder={t("createUser.placeholders.username", {
              defaultValue: "Enter username",
            })}
            value={formData.username}
            onChange={handleChange("username")}
            disabled={isSubmitting}
            aria-invalid={!!usernameError}
            aria-describedby={usernameError ? "create-username-error" : undefined}
          />

          {usernameError && (
            <span id="create-username-error" className="field-error">
              {usernameError}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="create-email" className="form-label">
            {t("createUser.labels.email", {
              defaultValue: "Email",
            })}{" "}
            <span className="required-mark">*</span>
          </label>

          <input
            type="email"
            id="create-email"
            name="email"
            autoComplete="email"
            className={`field-input ${emailError ? "error" : ""}`}
            placeholder={t("createUser.placeholders.email", {
              defaultValue: "Enter email address",
            })}
            value={formData.email}
            onChange={handleChange("email")}
            disabled={isSubmitting}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "create-email-error" : undefined}
          />

          {emailError && (
            <span id="create-email-error" className="field-error">
              {emailError}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="create-fullname" className="form-label">
            {t("createUser.labels.fullName", {
              defaultValue: "Full name",
            })}{" "}
            <span className="required-mark">*</span>
          </label>

          <input
            type="text"
            id="create-fullname"
            name="full_name"
            autoComplete="name"
            className={`field-input ${fullNameError ? "error" : ""}`}
            placeholder={t("createUser.placeholders.fullName", {
              defaultValue: "Enter full name",
            })}
            value={formData.full_name}
            onChange={handleChange("full_name")}
            disabled={isSubmitting}
            aria-invalid={!!fullNameError}
            aria-describedby={fullNameError ? "create-fullname-error" : undefined}
          />

          {fullNameError && (
            <span id="create-fullname-error" className="field-error">
              {fullNameError}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="create-password" className="form-label">
            {t("createUser.labels.password", {
              defaultValue: "Password",
            })}{" "}
            <span className="required-mark">*</span>
          </label>

          <input
            type="password"
            id="create-password"
            name="password"
            autoComplete="new-password"
            className={`field-input ${passwordError ? "error" : ""}`}
            placeholder={t("createUser.placeholders.password", {
              defaultValue: "Enter password",
            })}
            value={formData.password}
            onChange={handleChange("password")}
            disabled={isSubmitting}
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? "create-password-error" : undefined}
          />

          {passwordError && (
            <span id="create-password-error" className="field-error">
              {passwordError}
            </span>
          )}
        </div>

        <div className="form-group admin-form-select-wrap">
          <FormSelect
            label={
              <span>
                {t("createUser.labels.role", {
                  defaultValue: "Role",
                })}{" "}
                <span className="required-mark">*</span>
              </span>
            }
            value={String(formData.role_id)}
            onChange={handleChange("role_id")}
            options={roleOptions}
            disabled={isSubmitting}
          />

          {roleError && <span className="field-error">{roleError}</span>}
        </div>

        <FormActions>
          <Button
            variant="secondary"
            type="button"
            onClick={cancel}
            disabled={isSubmitting}
          >
            {t("createUser.buttons.cancel", {
              defaultValue: "Cancel",
            })}
          </Button>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t("createUser.buttons.creating", {
                  defaultValue: "Creating...",
                })
              : t("createUser.buttons.create", {
                  defaultValue: "Create user",
                })}
          </Button>
        </FormActions>
      </form>
    </Card>
  );
};

export default CreateUserCard;