// Client-side "contains" search over already-loaded rows. Walks an item's string/number/date
// values (and those of nested relations like `provider.tradingName`) up to `maxDepth`, so each
// table doesn't need its own hand-maintained list of searchable columns.
const DEFAULT_SKIP_KEYS = new Set(["id", "rawPayload"]);

function valueMatches(value: unknown, needle: string, depth: number): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.toLowerCase().includes(needle);
  if (typeof value === "number") return String(value).includes(needle);
  if (value instanceof Date) return value.toLocaleDateString("en-GB").includes(needle);
  if (depth <= 0 || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((entry) => valueMatches(entry, needle, depth - 1));
  return Object.entries(value).some(([key, entry]) => !DEFAULT_SKIP_KEYS.has(key) && valueMatches(entry, needle, depth - 1));
}

export function filterBySearch<T extends object>(items: T[], query: string, maxDepth = 2): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => valueMatches(item, needle, maxDepth));
}
