// Global confirm() store, mirroring `route-progress.ts`'s pattern — no
// context/provider needed, so call sites can `confirm(...)` from anywhere
// (event handlers, hooks) and a single host component renders the dialog.

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

interface Snapshot {
  options: ConfirmOptions | null;
}

let snapshot: Snapshot = { options: null };
const listeners = new Set<() => void>();
let resolvePending: ((value: boolean) => void) | null = null;

function setSnapshot(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // A call already pending gets treated as cancelled rather than silently
    // orphaned when a second confirm() overwrites it.
    resolvePending?.(false);
    resolvePending = resolve;
    setSnapshot({ options });
  });
}

export function resolveConfirm(value: boolean) {
  resolvePending?.(value);
  resolvePending = null;
  setSnapshot({ options: null });
}

export function getSnapshot(): Snapshot {
  return snapshot;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
