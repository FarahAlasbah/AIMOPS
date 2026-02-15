// frontend/src/shared/permissions/rolePermissions.js

// UI fallback permissions (NOT security). Backend must still enforce access.
export const ROLE_FALLBACK_PERMISSIONS = {
  "Marketing User": [
    "dashboard.view",
    "campaigns.view",
    "campaigns.create",
    "feedback.view",
    "feedback.upload",
    "data.upload",
    "reports.view",
  ],

  // keep owner more restricted (adjust if you want)
  "Business Owner": [
    "dashboard.view",
    "campaigns.view",
    "feedback.view",
    "reports.view",
  ],
};

export const getRoleName = (user) => {
  return (
    user?.role?.display_name ||
    user?.role_name ||
    user?.role ||
    ""
  );
};

export const inferFallbackPermissions = (user) => {
  if (!user) return [];
  if (user?.is_admin === true) return [];
  const roleName = getRoleName(user);
  return ROLE_FALLBACK_PERMISSIONS[roleName] || [];
};

export const mergePermissions = (user) => {
  const backendPerms = Array.isArray(user?.permissions) ? user.permissions : [];
  const fallbackPerms = inferFallbackPermissions(user);

  // unique merge
  return Array.from(new Set([...backendPerms, ...fallbackPerms]));
};
