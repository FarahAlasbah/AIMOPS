import { useState } from "react";
import { Card, Button, FormActions, InfoMessage } from "../../../shared/components";
import { useTranslation } from "react-i18next";

const defaultForm = {
  username: "",
  email: "",
  password: "",
  full_name: "",
  role_id: 2,
};

const CreateUserCard = ({ apiError, onCancel, onCreate, isSubmitting }) => {
  const { t } = useTranslation("admin");
  const [formData, setFormData] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  const roleOptions = [
    { value: 2, label: t("createUser.roles.marketing") },
    { value: 3, label: t("createUser.roles.owner") },
  ];

  const handleChange = (field) => (e) => {
    let value = e.target.value;
    if (field === "role_id") value = Number(value);

    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username) newErrors.username = t("createUser.errors.usernameRequired");
    else if (formData.username.length < 3) newErrors.username = t("createUser.errors.usernameMin");

    if (!formData.email) newErrors.email = t("createUser.errors.emailRequired");
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = t("createUser.errors.emailInvalid");

    if (!formData.full_name) newErrors.full_name = t("createUser.errors.fullNameRequired");

    if (!formData.password) newErrors.password = t("createUser.errors.passwordRequired");
    else if (formData.password.length < 6) newErrors.password = t("createUser.errors.passwordMin");

    if (![2, 3].includes(formData.role_id)) newErrors.role_id = t("createUser.errors.roleInvalid");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    await onCreate(formData);

    setFormData(defaultForm);
    setErrors({});
  };

  const cancel = () => {
    setFormData(defaultForm);
    setErrors({});
    onCancel();
  };

  return (
    <Card title={t("createUser.title")}>
      {apiError && <InfoMessage type="error">{apiError}</InfoMessage>}

      <form onSubmit={submit} autoComplete="on">
        <div className="form-group">
          <label htmlFor="create-username" className="form-label">
            {t("createUser.labels.username")} <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            type="text"
            id="create-username"
            name="username"
            autoComplete="username"
            className={`field-input ${errors.username ? "error" : ""}`}
            placeholder={t("createUser.placeholders.username")}
            value={formData.username}
            onChange={handleChange("username")}
            required
            disabled={isSubmitting}
          />
          {errors.username && <span className="field-error">{errors.username}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="create-email" className="form-label">
            {t("createUser.labels.email")} <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            type="email"
            id="create-email"
            name="email"
            autoComplete="email"
            className={`field-input ${errors.email ? "error" : ""}`}
            placeholder={t("createUser.placeholders.email")}
            value={formData.email}
            onChange={handleChange("email")}
            required
            disabled={isSubmitting}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="create-fullname" className="form-label">
            {t("createUser.labels.fullName")} <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            type="text"
            id="create-fullname"
            name="full_name"
            autoComplete="name"
            className={`field-input ${errors.full_name ? "error" : ""}`}
            placeholder={t("createUser.placeholders.fullName")}
            value={formData.full_name}
            onChange={handleChange("full_name")}
            required
            disabled={isSubmitting}
          />
          {errors.full_name && <span className="field-error">{errors.full_name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="create-password" className="form-label">
            {t("createUser.labels.password")} <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            type="password"
            id="create-password"
            name="password"
            autoComplete="new-password"
            className={`field-input ${errors.password ? "error" : ""}`}
            placeholder={t("createUser.placeholders.password")}
            value={formData.password}
            onChange={handleChange("password")}
            required
            disabled={isSubmitting}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="create-role" className="form-label">
            {t("createUser.labels.role")} <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <select
            id="create-role"
            name="role_id"
            className={`field-input field-select field-select-sm ${errors.role_id ? "error" : ""}`}
            value={formData.role_id}
            onChange={handleChange("role_id")}
            required
            disabled={isSubmitting}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.role_id && <span className="field-error">{errors.role_id}</span>}
        </div>

        <FormActions>
          <Button variant="secondary" type="button" onClick={cancel} disabled={isSubmitting}>
            {t("createUser.buttons.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("createUser.buttons.creating") : t("createUser.buttons.create")}
          </Button>
        </FormActions>
      </form>
    </Card>
  );
};

export default CreateUserCard;
