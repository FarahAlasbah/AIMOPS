import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";

import LoginAlert from "./LoginAlert";

const LoginForm = ({
  t,

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
}) => {
  return (
    <section className="login-form-side">
      <div className="login-form-container">
        <div className="login-header">
          <h2>{t("login.welcomeTitle")}</h2>
          <p>{t("login.welcomeSubtitle")}</p>
        </div>

        <LoginAlert
          message={apiError}
          onClose={() => setApiError("")}
          closeLabel={t("login.dismissError")}
        />

        <form
          onSubmit={handleSubmit}
          className="login-form"
          autoComplete="on"
          noValidate
        >
          <div className="form-field">
            <label htmlFor="username" className="field-label">
              {t("login.usernameLabel")}
            </label>

            <div className="input-shell">
              <UserRound size={16} className="input-icon" />

              <input
                type="text"
                id="username"
                name="username"
                autoComplete="username"
                className={`field-input${showErr("username") ? " error" : ""}`}
                placeholder={t("login.usernamePlaceholder")}
                value={formData.username}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
              />
            </div>

            {showErr("username") && (
              <span className="field-error">{showErr("username")}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password" className="field-label">
              {t("login.passwordLabel")}
            </label>

            <div className="input-shell password-input-wrapper">
              <LockKeyhole size={16} className="input-icon" />

              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                autoComplete="current-password"
                className={`field-input${showErr("password") ? " error" : ""}`}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                disabled={isLoading}
                aria-label={
                  showPassword
                    ? t("login.hidePassword")
                    : t("login.showPassword")
                }
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {showErr("password") && (
              <span className="field-error">{showErr("password")}</span>
            )}
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                disabled={isLoading}
              />

              <span>{t("login.rememberMe")}</span>
            </label>

            <button
              type="button"
              className="forgot-password-link"
              disabled={isLoading}
            >
              {t("login.forgotPassword")}
            </button>
          </div>

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="login-spinner" aria-hidden="true" />
                <span>{t("login.signingIn")}</span>
              </>
            ) : (
              <>
                <span>{t("login.signIn")}</span>
                <ArrowRight size={15} className="login-arrow" />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>{t("login.footer")}</p>
        </div>
      </div>
    </section>
  );
};

export default LoginForm;