function camelKey(key) {
  if (!key) return key;
  if (key === key.toUpperCase()) return key.toLowerCase();
  return key.charAt(0).toLowerCase() + key.slice(1);
}

export function camel(value) {
  if (Array.isArray(value)) return value.map(camel);
  if (value instanceof Date) return value;
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[camelKey(k)] = camel(v);
    }
    return out;
  }
  return value;
}

export function pick(body, pascalName) {
  const camelName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
  return body?.[camelName] ?? body?.[pascalName];
}

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
