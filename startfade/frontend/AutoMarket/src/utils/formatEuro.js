export function formatEuro(value, { cents = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "€0";
  const formatted = n.toLocaleString(undefined, {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  return `€${formatted}`;
}
