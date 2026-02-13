// frontend/src/shared/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { loginUser as apiLogin, logoutUser as apiLogout } from "../../api/auth";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

const safeParse = (v) => {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
};

const buildFieldErrorsFromFastApi = (detail) => {
  // FastAPI 422 example: detail: [{ loc: ["body","username"], msg: "...", type: "..." }, ...]
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

const normalizeLoginError = (err) => {
  const status = err?.response?.status;
  const data = err?.response?.data;

  // Try to get a useful "detail"
  const detail =
    data?.detail ??
    data?.message ??
    err?.detail ??
    err?.message ??
    null;

  // Field errors (FastAPI validation)
  const fieldErrors = buildFieldErrorsFromFastApi(data?.detail);

  let message = "Login failed. Please try again.";

  if (status === 401 || status === 403) {
    message = "Invalid username or password.";
  } else if (status === 422) {
    message = "Please check your input and try again.";
  } else if (status === 429) {
    message = "Too many attempts. Please wait a bit and try again.";
  } else if (!err?.response) {
    // Network / CORS / server down
    message = "Cannot reach the server. Please check your connection and try again.";
  } else if (typeof detail === "string" && detail.trim()) {
    message = detail;
  }

  const e = new Error(message);
  e.status = status;
  e.data = data;
  if (fieldErrors) e.fieldErrors = fieldErrors;
  return e;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user_data");

    if (token && userData) {
      const parsed = safeParse(userData);
      if (parsed) setUser(parsed);
      else {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
      }
    }

    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await apiLogin(credentials);

      // Ensure permissions exists (array)
      const normalizedUser = {
        ...response.user,
        permissions: Array.isArray(response.user?.permissions)
          ? response.user.permissions
          : [],
      };

      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("user_data", JSON.stringify(normalizedUser));
      setUser(normalizedUser);

      // Everyone lands in /app (guards will handle access)
      navigate("/app/overview", { replace: true });

      return response;
    } catch (err) {
      throw normalizeLoginError(err);
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
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
