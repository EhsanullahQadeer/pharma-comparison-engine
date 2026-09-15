import { useEffect, useRef } from "react";

type ActionResult = { error?: string; fieldErrors?: unknown };

// Shared by every useActionState-backed modal form (Offer/Discount/ProductVariant/StaffUser) —
// closes the modal the moment a pending submission resolves with no error/fieldErrors, without
// needing a server-side redirect (unlike ProviderForm, which redirects to a detail page instead).
export function useCloseModalOnSuccess(state: ActionResult, pending: boolean, onClose: () => void) {
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error && !state.fieldErrors) {
      onClose();
    }
    wasPending.current = pending;
  }, [pending, state, onClose]);
}
