"use client";

import { Loader2 } from "lucide-react";
import { cloneElement, isValidElement, useCallback } from "react";

import type { QueryKey } from "@/hooks/query-registry";
import type { MutationKey, MutationArgs, MutationData } from "@/hooks/useMutate";
import { useMutate } from "@/hooks/useMutate";
import { confirm } from "@/lib/confirm-store";

interface MutateButtonProps<K extends MutationKey> {
  action: K;
  args: MutationArgs<K>;
  confirmMessage?: string;
  confirmTitle?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "default" | "destructive";
  invalidateKeys?: QueryKey | QueryKey[];
  onSuccess?: (data: MutationData<K>) => void;
  onError?: (error: Error) => void;
  children: React.ReactElement<Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function MutateButton<K extends MutationKey>({
  action,
  args,
  confirmMessage,
  confirmTitle,
  confirmText,
  cancelText,
  confirmVariant,
  invalidateKeys,
  onSuccess,
  onError,
  children,
}: MutateButtonProps<K>) {
  const { mutateAsync, isPending } = useMutate(action, {
    invalidateKeys,
    onSuccess,
    onError,
  });

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isPending) return;

      if (confirmMessage) {
        const ok = await confirm({
          message: confirmMessage,
          title: confirmTitle,
          confirmText,
          cancelText,
          variant: confirmVariant,
        });
        if (!ok) return;
      }

      try {
        await mutateAsync(...args);
      } catch {
        // errors handled via onError callback
      }
    },
    [
      isPending,
      confirmMessage,
      confirmTitle,
      confirmText,
      cancelText,
      confirmVariant,
      mutateAsync,
      args,
    ],
  );

  if (!isValidElement(children)) return children;

  return cloneElement(children, {
    onClick: handleClick,
    disabled: isPending || children.props.disabled,
    children: isPending ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        {children.props.children}
      </>
    ) : (
      children.props.children
    ),
  });
}
