// frontend/src/shared/permissions/rolePermissions.js

export const ADMIN_PERMISSIONS = [
  "dashboard.view",

  "profile.view",
  "business_profile.view",
  "business_profile.edit",

  "data.upload",

  "products.view",

  "forecasts.view",

  "campaigns.view",
  "campaigns.create",

  "feedback.view",
  "feedback.upload",

  "consultation.view",

  "events.view",
  "events.view_detail",

  "calendar.view",

  "reports.view",

  "notifications.create",

  "users.view",
];

export const MARKETING_PERMISSIONS = ADMIN_PERMISSIONS.filter(
  (permission) =>
    permission !== "users.view" && permission !== "business_profile.edit",
);

export const BUSINESS_OWNER_PERMISSIONS = [
  "dashboard.view",
  "business_profile.view",
  "reports.view",
];

export const ROLE_FALLBACK_PERMISSIONS = {
  Administrator: ADMIN_PERMISSIONS,
  Admin: ADMIN_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,

  "Marketing User": MARKETING_PERMISSIONS,
  "marketing user": MARKETING_PERMISSIONS,
  Marketing: MARKETING_PERMISSIONS,
  marketing: MARKETING_PERMISSIONS,

  "Business Owner": BUSINESS_OWNER_PERMISSIONS,
  "business owner": BUSINESS_OWNER_PERMISSIONS,
};

export const getRoleName = (user) => {
  return (
    user?.role?.display_name ||
    user?.role_name ||
    user?.role?.name ||
    user?.role?.key ||
    user?.role ||
    ""
  );
};

export const isAdminUser = (user) => {
  const roleName = String(getRoleName(user)).trim().toLowerCase();

  return (
    user?.is_admin === true ||
    roleName === "administrator" ||
    roleName === "admin"
  );
};

export const inferFallbackPermissions = (user) => {
  if (!user) return [];

  if (isAdminUser(user)) {
    return ADMIN_PERMISSIONS;
  }

  const roleName = getRoleName(user);
  return ROLE_FALLBACK_PERMISSIONS[roleName] || [];
};

export const mergePermissions = (user) => {
  const backendPerms = Array.isArray(user?.permissions) ? user.permissions : [];
  const fallbackPerms = inferFallbackPermissions(user);

  const merged = Array.from(new Set([...backendPerms, ...fallbackPerms]));

  const roleName = String(getRoleName(user)).trim().toLowerCase();
  const isMarketing = roleName === "marketing user" || roleName === "marketing";

  if (!isAdminUser(user)) {
    let safePermissions = merged.filter(
      (permission) => permission !== "business_profile.edit",
    );

    // Strict rule: Marketing must never get user management access,
    // even if the backend accidentally sends users.view.
    if (isMarketing) {
      safePermissions = safePermissions.filter(
        (permission) => permission !== "users.view",
      );
    }

    return safePermissions;
  }

  return merged;
};