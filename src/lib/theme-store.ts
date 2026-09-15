// Global dark/light theme store, mirroring confirm-store.ts's pattern — a plain external store so
// any client component can subscribe to theme changes without a React context/provider.
const listeners = new Set<() => void>();

export function subscribeToTheme(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark");
}

export function setTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");
  listeners.forEach((listener) => listener());
}
