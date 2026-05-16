export const normalizeUsersResponse = (raw) => {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.users)
      ? raw.users
      : Array.isArray(raw?.data)
        ? raw.data
        : [];

  return list.map((u) => {
    const status = String(u.status || "").toLowerCase();

    return {
      ...u,
      id: u.user_id ?? u.id,
      name: u.full_name ?? u.name ?? "",
      role: u.role_name ?? u.role ?? "",
      is_active: status === "active",
      status,
    };
  });
};