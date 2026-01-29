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
    const response = await apiLogin(credentials);

    // Ensure permissions exists (array)
    const normalizedUser = {
      ...response.user,
      permissions: Array.isArray(response.user?.permissions) ? response.user.permissions : [],
    };

    localStorage.setItem("auth_token", response.access_token);
    localStorage.setItem("user_data", JSON.stringify(normalizedUser));
    setUser(normalizedUser);

    // Everyone lands in /app (guards will handle access)
    navigate("/app/overview", { replace: true });

    return response;
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
