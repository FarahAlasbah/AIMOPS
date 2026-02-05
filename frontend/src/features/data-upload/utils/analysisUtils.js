const formatPercent = (n) => {
  const x = Number(n);
  if (Number.isNaN(x)) return "-";
  return `${x.toFixed(0)}%`;
};

const formatConfidence = (n) => {
  const x = Number(n);
  if (Number.isNaN(x)) return "-";
  return `${Math.round(x * 100)}%`; // backend sends 0..1
};

const levelChipClass = (level) => {
  const v = String(level || "").toLowerCase();
  if (v === "high") return "good";
  if (v === "medium") return "warn";
  if (v === "low") return "bad";
  return "";
};

const boolText = (v) => (v ? "Yes" : "No");

const buildRoleOptions = (column) => {
  const role = column?.role;
  const alternatives = Array.isArray(column?.alternative_roles) ? column.alternative_roles : [];

  // include current role + alternatives, unique, stringify
  const values = [...alternatives, role]
    .filter(Boolean)
    .map(String)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  return values.map((v) => ({ value: v, label: v }));
};

export { formatPercent, formatConfidence, levelChipClass, boolText, buildRoleOptions };
