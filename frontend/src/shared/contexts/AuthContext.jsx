// frontend/src/shared/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { loginUser as apiLogin, logoutUser as apiLogout } from "../../api/auth";
import { useNavigate } from "react-router-dom";
import { getRoleName, mergePermissions } from "../permissions/rolePermissions";

const AuthContext = createContext();

const safeParse = (v) => {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const buildFieldErrorsFromFastApi = (detail) => {
  if (!Array.isArray(detail)) return null;

  const fieldErrors = {};

  for (const item of detail) {
    const loc = Array.isArray(item?.loc) ? item.loc : [];
    const field = loc[loc.length - 1];
    const msg = item?.msg;

    if ((field === "username" || field === "password") && msg) {
      fieldErrors[field] = msg;
    }
  }

  return Object.keys(fieldErrors).length ? fieldErrors : null;
};

const normalizeLoginError = (err, t) => {
  const status = err?.response?.status;
  const data = err?.response?.data;

  const detail =
    data?.detail ??
    data?.message ??
    err?.detail ??
    err?.message ??
    null;

  const fieldErrors = buildFieldErrorsFromFastApi(data?.detail);

  let message = t("auth.loginErrors.failed");

  if (status === 401 || status === 403) {
    message = t("auth.loginErrors.invalidCredentials");
  } else if (status === 422) {
    message = t("auth.loginErrors.checkInput");
  } else if (status === 429) {
    message = t("auth.loginErrors.tooManyAttempts");
  } else if (!err?.response) {
    message = t("auth.loginErrors.serverUnavailable");
  } else if (typeof detail === "string" && detail.trim()) {
    message = detail;
  }

  const e = new Error(message);
  e.status = status;
  e.data = data;

  if (fieldErrors) e.fieldErrors = fieldErrors;

  return e;
};

const normalizeUser = (rawUser) => {
  if (!rawUser) return null;

  const roleName = getRoleName(rawUser);

  const normalized = {
    ...rawUser,
    role_name: rawUser?.role_name || roleName || rawUser?.role_name,
    permissions: mergePermissions(rawUser),
    is_admin: rawUser?.is_admin === true,
  };

  return normalized;
};

export const AuthProvider = ({ children }) => {
  const { t } = useTranslation("common");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user_data");

    if (token && userData) {
      const parsed = safeParse(userData);

      if (parsed) {
        setUser(normalizeUser(parsed));
      } else {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
      }
    }

    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await apiLogin(credentials);

      const normalizedUser = normalizeUser(response.user);

      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("user_data", JSON.stringify(normalizedUser));
      setUser(normalizedUser);

      navigate("/app/overview", { replace: true });
      return response;
    } catch (err) {
      throw normalizeLoginError(err, t);
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      setUser(null);
      navigate("/login", { replace: true });
    }
  };

  const hasPermission = (permission) => {
    if (!permission) return true;
    if (user?.is_admin === true) return true;

    const perms = Array.isArray(user?.permissions) ? user.permissions : [];
    return perms.includes(permission);
  };

  const value = {
    user,
    setUser,
    login,
    logout,
    loading,
    isAuthenticated: !!user,
    hasPermission,
    isAdmin: () => user?.is_admin === true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
};