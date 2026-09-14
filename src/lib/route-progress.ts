let pending = false;
let timeout: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const getSnapshot = () => pending;
export const getServerSnapshot = () => false;
export function done() {
  clearTimeout(timeout);
  pending = false;
  listeners.forEach((listener) => listener());
}
export function start() {
  clearTimeout(timeout);
  pending = true;
  listeners.forEach((listener) => listener());
  timeout = setTimeout(done, 15000);
}
