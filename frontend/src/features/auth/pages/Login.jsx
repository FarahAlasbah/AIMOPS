// frontend/src/features/auth/pages/Login.jsx
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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

import "./Login.css";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIN_LOADING_MS = 600;

const Login = () => {
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
    if (name === "username" && !v) return "Username is required";
    if (name === "password" && !v) return "Password is required";
    return "";
  };

  const validateForm = () => {
    const newErrors = {
      username: validateField("username", formData.username),
      password: validateField("password", formData.password),
    };

    Object.keys(newErrors).forEach((k) => {
      if (!newErrors[k]) delete newErrors[k];
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    // keep API error visible (don’t auto-clear it here)
    // setApiError("");  <-- removed

    // clear only the specific field error while typing
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

    // clear old API error only when user submits again
    setApiError("");

    if (!validateForm()) return;

    setIsLoading(true);
    const started = Date.now();

    try {
      await login({
        username: formData.username.trim(),
        password: formData.password,
      });
    } catch (error) {
      // keep spinner visible at least MIN_LOADING_MS on failure
      const elapsed = Date.now() - started;
      if (elapsed < MIN_LOADING_MS) await sleep(MIN_LOADING_MS - elapsed);

      if (error?.fieldErrors) {
        setErrors((prev) => ({ ...prev, ...error.fieldErrors }));
      }

      setApiError(error?.message || "Invalid username or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <div className="brand-content">
            <div className="brand-logo">
              <div className="logo-icon">
                <LayoutDashboard size={28} />
              </div>
              <h1 className="brand-name">AIMOPS</h1>
            </div>

            <p className="brand-tagline">
              AI-driven Marketing and Operations Predicting System
            </p>

            <div className="brand-features">
              <div className="feature-item">
                <div className="feature-icon">
                  <TrendingUp size={20} />
                </div>
                <span className="feature-text">Demand Forecasting</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <Megaphone size={20} />
                </div>
                <span className="feature-text">Campaign Management</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <MessageSquare size={20} />
                </div>
                <span className="feature-text">Feedback Analysis</span>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <BarChart3 size={20} />
                </div>
                <span className="feature-text">Smart Insights</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-form-side">
          <div className="login-form-container">
            <div className="login-header">
              <h2>Welcome Back</h2>
              <p>Sign in to your account to continue</p>
            </div>

            {apiError && (
              <div
                className="alert alert-error"
                role="alert"
                aria-live="polite"
                id="login-alert"
              >
                <div className="alert-text">{apiError}</div>
                <button
                  type="button"
                  className="alert-close"
                  onClick={() => setApiError("")}
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="login-form"
              autoComplete="on"
              noValidate
            >
              <div className="form-field">
                <label htmlFor="username" className="field-label">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  autoComplete="username"
                  className={`field-input ${showFieldError("username") ? "error" : ""}`}
                  placeholder="Enter your username"
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
                  Password
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
                    aria-label={showPassword ? "Hide password" : "Show password"}
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
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="forgot-password-link"
                  disabled={isLoading}
                >
                  Forgot Password?
                </button>
              </div>

              <button type="submit" className="login-button" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="login-footer">
              <p>&copy; 2025 AIMOPS. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
