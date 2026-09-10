export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 6, useGrouping: false });
}

export function formatSize(value: number | string | null | undefined, unit?: string | null): string {
  const number = formatNumber(value);
  return number ? `${number}${unit ? ` ${unit}` : ""}` : "";
}

export function formatQuantity(value: number | string): string {
  return formatNumber(value);
}
