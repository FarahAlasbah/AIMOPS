// frontend/src/routes/RequirePermission.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../shared/contexts/AuthContext";

export default function RequirePermission({
  anyOf = [],
  allOf = [],
  redirectTo = "/login",
  children,
}) {
  const { loading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Admin bypass
  if (user?.is_admin === true) return children;

  const perms = Array.isArray(user?.permissions) ? user.permissions : [];

  const okAny =
    anyOf.length === 0 ? true : anyOf.some((p) => perms.includes(p));

  const okAll =
    allOf.length === 0 ? true : allOf.every((p) => perms.includes(p));

  if (okAny && okAll) return children;

  // Logged in but not allowed
  return <Navigate to="/app/denied" replace />;
}
