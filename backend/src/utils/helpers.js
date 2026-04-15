export function slugify(value = "") {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function formatOrderCode(id) {
  return `SN${String(id).padStart(6, "0")}`;
}

export function calcFinalPrice({ price, discountPct, oldPrice }) {
  const base = Number(price || 0);
  const discount = Number(discountPct || 0);
  if (discount > 0) {
    return Math.max(0, Math.round(base * (1 - discount / 100)));
  }
  if (oldPrice && oldPrice > base) {
    return base;
  }
  return base;
}

export function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeText(value = "") {
  return String(value).trim();
}
