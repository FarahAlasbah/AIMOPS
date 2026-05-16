export const ROLE_TO_ID = {
  "Marketing User": 2,
  "Business Owner": 3,
  Administrator: 1,
};

const fieldAliases = {
  email: ["email"],
  full_name: ["full_name", "fullName", "name"],
  role_id: ["role_id", "role", "roleId"],
  current_password: ["current_password", "currentPassword", "old_password"],
  new_password: ["new_password", "newPassword", "password"],
};

export const getMergedFieldError = (field, localErrors, backendErrors) => {
  if (localErrors[field]) return localErrors[field];

  const aliases = fieldAliases[field] || [field];
  return aliases.map((key) => backendErrors?.[key]).find(Boolean) || "";
};

export function getInitialUserForm(user) {
  const role_id = ROLE_TO_ID[user?.role_name] || 2;

  return {
    username: user?.username || "",
    email: user?.email || "",
    full_name: user?.full_name || "",
    role_id,
  };
}

export function createRoleOptions(initialRoleId, t) {
  const options = [];

  if (initialRoleId === 1) {
    options.push({
      value: "1",
      label: t("createUser.roles.admin", {
        defaultValue: "Administrator",
      }),
    });
  }

  options.push(
    {
      value: "2",
      label: t("createUser.roles.marketing", {
        defaultValue: "Marketing User",
      }),
    },
    {
      value: "3",
      label: t("createUser.roles.owner", {
        defaultValue: "Business Owner",
      }),
    },
  );

  return options;
}

export function validateEditUserForm({ form, isProtectedAdmin, t }) {
  const nextErrors = {};
  const email = String(form.email || "").trim();
  const fullName = String(form.full_name || "").trim();
  const roleId = Number(form.role_id);

  if (!email) {
    nextErrors.email = t("editUser.errors.emailRequired", {
      defaultValue: "Email is required.",
    });
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    nextErrors.email = t("editUser.errors.emailInvalid", {
      defaultValue: "Enter a valid email address.",
    });
  }

  if (!fullName) {
    nextErrors.full_name = t("editUser.errors.fullNameRequired", {
      defaultValue: "Full name is required.",
    });
  }

  if (!isProtectedAdmin && ![2, 3].includes(roleId)) {
    nextErrors.role_id = t("editUser.errors.roleInvalid", {
      defaultValue: "Choose a valid role.",
    });
  }

  return nextErrors;
}

export function buildUserUpdatePayload({ form, initial, isProtectedAdmin }) {
  const email = String(form.email || "").trim();
  const fullName = String(form.full_name || "").trim();
  const roleId = Number(form.role_id);

  const payload = {};

  if (email !== initial.email) payload.email = email;
  if (fullName !== initial.full_name) payload.full_name = fullName;
  if (!isProtectedAdmin && roleId !== initial.role_id) {
    payload.role_id = roleId;
  }

  return payload;
}

export function validatePasswordForm({
  passwordActionsEnabled,
  currentPassword,
  newPassword,
  t,
}) {
  const nextErrors = {};

  if (!passwordActionsEnabled) {
    nextErrors.new_password = t("editUser.password.errors.adminOnly", {
      defaultValue: "Only administrators can change user passwords.",
    });

    return nextErrors;
  }

  const current = String(currentPassword || "").trim();
  const next = String(newPassword || "").trim();

  if (!current) {
    nextErrors.current_password = t("editUser.password.errors.currentRequired", {
      defaultValue: "Current password is required.",
    });
  }

  if (!next) {
    nextErrors.new_password = t("editUser.password.errors.newRequired", {
      defaultValue: "New password is required.",
    });
  } else if (next.length < 8) {
    nextErrors.new_password = t("editUser.password.errors.newMin", {
      defaultValue: "New password must be at least 8 characters.",
    });
  }

  return nextErrors;
}