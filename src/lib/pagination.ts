export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

export const DEFAULT_PAGE_SIZE: number = PAGE_SIZE_OPTIONS[0];

/** Parses a `pageSize` search-param value from a server component, falling back to the default for anything absent or not one of `PAGE_SIZE_OPTIONS`. */
export function parsePageSize(raw: string | undefined): number {
  const parsed = Number(raw);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed) ? parsed : DEFAULT_PAGE_SIZE;
}
