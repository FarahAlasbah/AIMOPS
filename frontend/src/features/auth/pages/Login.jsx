// frontend/src/features/auth/pages/Login.jsx
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Eye,
  EyeOff,
  BarChart3,
  Megaphone,
  MessageSquare,
  TrendingUp,
  LayoutDashboard,
} from "lucide-react";
import { useState, useEffect } from "react";
import LangToggle from "../../../shared/components/LangToggle";

import "./Login.css";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIN_LOADING_MS = 600;

const Login = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/app/overview", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateField = (name, value) => {
    const v = (value ?? "").trim();
    if (name === "username" && !v) return t("login.usernameRequired");
    if (name === "password" && !v) return t("login.passwordRequired");
    return "";
  };

  const validateForm = () => {
    const newErrors = {
      username: validateField("username", formData.username),
      password: validateField("password", formData.password),
    };
    Object.keys(newErrors).forEach((k) => { if (!newErrors[k]) delete newErrors[k]; });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const msg = validateField(name, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[name] = msg;
      else delete next[name];
      return next;
    });
  };

  const showFieldError = (name) => {
    if (!(submitted || touched[name])) return "";
    return errors[name] || "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setApiError("");
    if (!validateForm()) return;

    setIsLoading(true);
    const started = Date.now();

    try {
      await login({ username: formData.username.trim(), password: formData.password });
    } catch (error) {
      const elapsed = Date.now() - started;
      if (elapsed < MIN_LOADING_MS) await sleep(MIN_LOADING_MS - elapsed);
      if (error?.fieldErrors) setErrors((prev) => ({ ...prev, ...error.fieldErrors }));
      setApiError(error?.message || t("login.errorInvalidCredentials"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Language toggle — floated to the top-right corner of the page */}
      <div className="login-lang">
        <LangToggle />
      </div>

      <div className="login-container">
        <div className="login-brand">
          <div className="brand-content">
            <div className="brand-logo">
              <div className="logo-icon"><LayoutDashboard size={28} /></div>
              <h1 className="brand-name">AIMOPS</h1>
            </div>

            <p className="brand-tagline">{t("login.brandTagline")}</p>

            <div className="brand-features">
              <div className="feature-item">
                <div className="feature-icon"><TrendingUp size={20} /></div>
                <span className="feature-text">{t("login.featureDemand")}</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><Megaphone size={20} /></div>
                <span className="feature-text">{t("login.featureCampaign")}</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><MessageSquare size={20} /></div>
                <span className="feature-text">{t("login.featureFeedback")}</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon"><BarChart3 size={20} /></div>
                <span className="feature-text">{t("login.featureInsights")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-form-side">
          <div className="login-form-container">
            <div className="login-header">
              <h2>{t("login.welcomeTitle")}</h2>
              <p>{t("login.welcomeSubtitle")}</p>
            </div>

            {apiError && (
              <div className="alert alert-error" role="alert" aria-live="polite" id="login-alert">
                <div className="alert-text">{apiError}</div>
                <button
                  type="button"
                  className="alert-close"
                  onClick={() => setApiError("")}
                  aria-label={t("login.dismissError")}
                >
                  ×
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form" autoComplete="on" noValidate>
              <div className="form-field">
                <label htmlFor="username" className="field-label">
                  {t("login.usernameLabel")}
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  autoComplete="username"
                  className={`field-input ${showFieldError("username") ? "error" : ""}`}
                  placeholder={t("login.usernamePlaceholder")}
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={isLoading}
                />
                {showFieldError("username") && (
                  <span className="field-error">{showFieldError("username")}</span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="password" className="field-label">
                  {t("login.passwordLabel")}
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    className={`field-input ${showFieldError("password") ? "error" : ""}`}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {showFieldError("password") && (
                  <span className="field-error">{showFieldError("password")}</span>
                )}
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>{t("login.rememberMe")}</span>
                </label>

                <button type="button" className="forgot-password-link" disabled={isLoading}>
                  {t("login.forgotPassword")}
                </button>
              </div>

              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? t("login.signingIn") : t("login.signIn")}
              </button>
            </form>

            <div className="login-footer">
              <p>{t("login.footer")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;