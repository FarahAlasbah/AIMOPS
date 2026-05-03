import { useAuth } from "../../../shared/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, UserRound, LockKeyhole, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import LangToggle from "../../../shared/components/LangToggle";
import "./Login.css";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MIN_LOADING_MS = 600;

const BgCanvas = () => (
  <svg
    className="login-bg-canvas"
    viewBox="0 0 560 660"
    preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <marker
        id="arrowW"
        markerWidth="6"
        markerHeight="6"
        refX="3"
        refY="3"
        orient="auto"
      >
        <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.28)" />
      </marker>

      <marker
        id="arrowG"
        markerWidth="6"
        markerHeight="6"
        refX="3"
        refY="3"
        orient="auto"
      >
        <path d="M0,0 L6,3 L0,6 Z" fill="rgba(110,231,183,0.7)" />
      </marker>

      <radialGradient id="vig" cx="50%" cy="60%" r="52%">
        <stop offset="0%" stopColor="transparent" />
        <stop offset="100%" stopColor="#03045e" stopOpacity="0.75" />
      </radialGradient>
    </defs>

    <g stroke="rgba(255,255,255,0.042)" strokeWidth="1">
      {[80, 160, 240, 320, 400].map((y) => (
        <line key={y} x1="0" y1={y} x2="560" y2={y} />
      ))}

      {[140, 280, 420].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="660" />
      ))}
    </g>

    <polyline
      points="30,240 80,210 130,222 180,185 230,165 285,142 340,125 395,104 450,82 505,60"
      fill="none"
      stroke="rgba(255,255,255,0.16)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />

    <polygon
      points="30,240 80,210 130,222 180,185 230,165 285,142 340,125 395,104 450,82 505,60 505,260 30,260"
      fill="rgba(255,255,255,0.03)"
    />

    <line
      x1="370"
      y1="120"
      x2="445"
      y2="78"
      stroke="rgba(110,231,183,0.65)"
      strokeWidth="1.5"
      markerEnd="url(#arrowG)"
    />

    {[
      { x: 330, h: 52 },
      { x: 350, h: 70 },
      { x: 370, h: 58 },
      { x: 390, h: 90 },
      { x: 410, h: 74 },
      { x: 430, h: 108 },
    ].map(({ x, h }, index) => (
      <rect
        key={index}
        x={x}
        y={250 - h}
        width="14"
        height={h}
        rx="3"
        fill={index === 5 ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.14)"}
        opacity="0.55"
      />
    ))}

    <text
      x="382"
      y="242"
      fill="rgba(255,255,255,0.22)"
      fontSize="8"
      fontFamily="Inter,sans-serif"
      fontWeight="600"
      textAnchor="middle"
      letterSpacing=".08em"
    >
      CONVERSIONS
    </text>

    <line
      x1="42"
      y1="340"
      x2="42"
      y2="288"
      stroke="rgba(110,231,183,0.55)"
      strokeWidth="1.5"
      markerEnd="url(#arrowG)"
    />

    <text
      x="56"
      y="306"
      fill="rgba(110,231,183,0.6)"
      fontSize="10"
      fontFamily="Inter,sans-serif"
      fontWeight="700"
    >
      +18.4%
    </text>

    <text
      x="56"
      y="319"
      fill="rgba(255,255,255,0.22)"
      fontSize="9"
      fontFamily="Inter,sans-serif"
    >
      Campaign ROI
    </text>

    {[
      [85, 355],
      [112, 336],
      [144, 344],
      [172, 322],
      [200, 310],
      [228, 296],
      [256, 302],
    ].map(([x, y], index) => (
      <circle
        key={index}
        cx={x}
        cy={y}
        r={index % 3 === 1 ? 4 : 3}
        fill="rgba(255,255,255,0.2)"
      />
    ))}

    <line
      x1="82"
      y1="358"
      x2="260"
      y2="298"
      stroke="rgba(255,255,255,0.1)"
      strokeWidth="1"
      strokeDasharray="4 3"
    />

    <polyline
      points="55,400 92,432 138,396 192,368"
      fill="none"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="1.5"
      strokeLinejoin="round"
      markerEnd="url(#arrowG)"
    />

    <circle
      cx="490"
      cy="155"
      r="40"
      fill="none"
      stroke="rgba(255,255,255,0.07)"
      strokeWidth="13"
    />

    <circle
      cx="490"
      cy="155"
      r="40"
      fill="none"
      stroke="rgba(255,255,255,0.22)"
      strokeWidth="13"
      strokeDasharray="158 93"
      strokeDashoffset="0"
      strokeLinecap="round"
    />

    <circle
      cx="490"
      cy="155"
      r="40"
      fill="none"
      stroke="rgba(110,231,183,0.38)"
      strokeWidth="13"
      strokeDasharray="62 189"
      strokeDashoffset="-158"
      strokeLinecap="round"
    />

    <text
      x="490"
      y="150"
      fill="rgba(255,255,255,0.72)"
      fontSize="12"
      fontFamily="Inter,sans-serif"
      fontWeight="800"
      textAnchor="middle"
    >
      84%
    </text>

    <text
      x="490"
      y="163"
      fill="rgba(255,255,255,0.28)"
      fontSize="8"
      fontFamily="Inter,sans-serif"
      textAnchor="middle"
      letterSpacing=".06em"
    >
      FORECAST
    </text>

    <line
      x1="30"
      y1="460"
      x2="190"
      y2="368"
      stroke="rgba(255,255,255,0.06)"
      strokeWidth="2"
      markerEnd="url(#arrowW)"
    />

    {[65, 98, 132].map((r, index) => (
      <circle
        key={index}
        cx="500"
        cy="550"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.045)"
        strokeWidth="1"
        opacity={1 - index * 0.2}
      />
    ))}

    <rect width="560" height="660" fill="url(#vig)" />
  </svg>
);

const Login = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

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

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/app/overview", { replace: true });
    }
  }, [isAuthenticated, navigate]);

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

  return (
    <div className="login-page">
      <div className="login-lang">
        <LangToggle />
      </div>

      <main className="login-container">
        <aside className="login-brand">
          <BgCanvas />

          <div className="brand-bottom">
            <div className="brand-top">
              <div className="brand-logo-row">
                <span className="brand-wordmark">AIMOPS</span>
              </div>

              <p className="brand-meaning">
                AI-driven Marketing and Operations Predicting System
              </p>

            

                <h2 className="brand-headline">
  All your marketing.
  <br />
  <em>One platform.</em>
</h2>

              </div>
            </div>

            <div className="brand-features" aria-label="AIMOPS key features">
              <span>Import data</span>
              <span>Predict demand</span>
              <span>Detect promotions</span>
              <span>Consult with AI</span>
            </div>
        
        </aside>

        <section className="login-form-side">
          <div className="login-form-container">
            <div className="login-header">
              <h2>{t("login.welcomeTitle")}</h2>
              <p>{t("login.welcomeSubtitle")}</p>
            </div>

            {apiError && (
              <div
                className="alert alert-error"
                role="alert"
                aria-live="polite"
              >
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
                    className={`field-input${
                      showErr("username") ? " error" : ""
                    }`}
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
                    className={`field-input${
                      showErr("password") ? " error" : ""
                    }`}
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

              <button
                type="submit"
                className="login-button"
                disabled={isLoading}
              >
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
      </main>
    </div>
  );
};

export default Login;
