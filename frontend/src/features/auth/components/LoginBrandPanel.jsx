import LoginBgCanvas from "./LoginBgCanvas";

const LoginBrandPanel = ({ t }) => {
  return (
    <aside className="login-brand">
      <LoginBgCanvas t={t} />

      <div className="brand-bottom">
        <div className="brand-top">
          <div className="brand-logo-row">
            <span className="brand-wordmark">AIMOPS</span>
          </div>

          <p className="brand-meaning">{t("login.brandTagline")}</p>

          <h2 className="brand-headline">
            {t("login.headlineLine1")}
            <br />
            <em>{t("login.headlineLine2")}</em>
          </h2>
        </div>

        <div className="brand-features" aria-label={t("login.featuresAria")}>
          <span>{t("login.featureImportData")}</span>
          <span>{t("login.featurePredictDemand")}</span>
          <span>{t("login.featureDetectPromotions")}</span>
          <span>{t("login.featureConsultAI")}</span>
        </div>
      </div>
    </aside>
  );
};

export default LoginBrandPanel;