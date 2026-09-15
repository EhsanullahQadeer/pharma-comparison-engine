import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
type FieldErrorsLike = Record<string, unknown>

function findFirstErrorFieldName(
  errors: FieldErrorsLike,
  prefix = ""
): string | null {
  for (const [key, value] of Object.entries(errors)) {
    if (!value || typeof value !== "object") continue
    const path = prefix ? `${prefix}.${key}` : key

    if ("message" in value) return path

    const nested = findFirstErrorFieldName(value as FieldErrorsLike, path)
    if (nested) return nested
  }
  return null
}

export function scrollToFirstInvalidField(errors: FieldErrorsLike) {
  const name = findFirstErrorFieldName(errors)
  if (!name) return

  const element =
    document.getElementsByName(name)[0] ??
    document.getElementById(name) ??
    document.querySelector<HTMLElement>(`[name="${name}"]`)

  if (element instanceof HTMLElement) {
    element.scrollIntoView({ behavior: "smooth", block: "center" })
    element.focus({ preventScroll: true })
  }
}
