// frontend/src/shared/theme/themeToCssVars.js
import { theme } from "./theme";

const setVar = (name, value) => {
  document.documentElement.style.setProperty(name, String(value));
};

export const applyTheme = (t = theme) => {
  const c = t.colors;

  setVar("--c-primary", c.primary);
  setVar("--c-primary-soft", c.primarySoft);

  setVar("--c-bg", c.bg);
  setVar("--c-surface", c.surface);
  setVar("--c-surface-muted", c.surfaceMuted);

  setVar("--c-border", c.border);
  setVar("--c-border-strong", c.borderStrong);

  setVar("--c-text", c.text);
  setVar("--c-text-muted", c.textMuted);
  setVar("--c-text-subtle", c.textSubtle);

  setVar("--c-success-bg", c.successBg);
  setVar("--c-success-border", c.successBorder);
  setVar("--c-success-text", c.successText);

  setVar("--c-warn-bg", c.warnBg);
  setVar("--c-warn-border", c.warnBorder);
  setVar("--c-warn-text", c.warnText);

  setVar("--c-danger-bg", c.dangerBg);
  setVar("--c-danger-border", c.dangerBorder);
  setVar("--c-danger-text", c.dangerText);

  setVar("--c-overlay", c.overlay);
  setVar("--c-overlay-soft", c.overlaySoft);

  setVar("--r-sm", t.radius.sm);
  setVar("--r-md", t.radius.md);
  setVar("--r-lg", t.radius.lg);
  setVar("--r-xl", t.radius.xl);
  setVar("--r-pill", t.radius.pill);

  setVar("--sh-sm", t.shadow.sm);
  setVar("--sh-md", t.shadow.md);
  setVar("--sh-modal", t.shadow.modal);
  setVar("--sh-glow-primary", t.shadow.glowPrimary);

  setVar("--fs-xs", t.font.size.xs);
  setVar("--fs-sm", t.font.size.sm);
  setVar("--fs-md", t.font.size.md);
  setVar("--fs-lg", t.font.size.lg);
  setVar("--fs-xl", t.font.size.xl);

  setVar("--fw-medium", t.font.weight.medium);
  setVar("--fw-bold", t.font.weight.bold);
  setVar("--fw-extra", t.font.weight.extra);
  setVar("--fw-black", t.font.weight.black);
};
