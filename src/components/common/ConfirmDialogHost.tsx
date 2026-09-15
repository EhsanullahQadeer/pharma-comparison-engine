"use client";

import { useSyncExternalStore } from "react";

import { Button } from "@/components/common/button";
import Modal from "@/components/common/modal";
import { getSnapshot, resolveConfirm, subscribe } from "@/lib/confirm-store";

const emptySnapshot = { options: null };

// Single host for every confirm() call in the app — mirrors RouteProgressBar's relationship to
// route-progress.ts. Mounted once in the root layout; confirm()/resolveConfirm() work from
// anywhere with no provider/context needed.
export function ConfirmDialogHost() {
  const { options } = useSyncExternalStore(subscribe, getSnapshot, () => emptySnapshot);

  return (
    <Modal
      open={options !== null}
      onOpenChange={(open) => {
        if (!open) resolveConfirm(false);
      }}
      title={options?.title ?? "Are you sure?"}
      description={options?.message}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => resolveConfirm(false)}>
            {options?.cancelText ?? "Cancel"}
          </Button>
          <Button
            type="button"
            variant={options?.variant === "destructive" ? "destructive" : "default"}
            onClick={() => resolveConfirm(true)}
          >
            {options?.confirmText ?? "Confirm"}
          </Button>
        </>
      }
    />
  );
}
