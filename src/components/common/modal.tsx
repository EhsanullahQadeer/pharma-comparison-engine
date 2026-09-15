"use client";

import { useState, type ReactElement, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface ModalChildProps {
  close: () => void;
}

export interface ModalProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactElement;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
  closeOnOutsideClick?: boolean;
  disabled?: boolean;
  children?:
    | ReactElement<Partial<ModalChildProps>>
    | ((props: ModalChildProps) => ReactNode);
}

export default function Modal({
  open,
  defaultOpen = false,
  onOpenChange,
  trigger,
  title,
  description,
  footer,
  contentClassName,
  closeOnOutsideClick = true,
  disabled = false,
  children,
}: ModalProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;

  let currentOpen: boolean;
  if (disabled) {
    currentOpen = false;
  } else if (isControlled) {
    currentOpen = open;
  } else {
    currentOpen = internalOpen;
  }

  const handleOpenChange = (nextOpen: boolean, details: { reason?: string }) => {
    if (!closeOnOutsideClick && (details.reason === "outsidePress" || details.reason === "escapeKey")) {
      return;
    }
    if (!isControlled) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const close = () => {
    if (!isControlled) setInternalOpen(false);
    onOpenChange?.(false);
  };

  return (
    <Dialog
      open={currentOpen}
      onOpenChange={handleOpenChange}
      disablePointerDismissal={!closeOnOutsideClick}
    >
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent
        className={cn("flex max-h-[85vh] flex-col overflow-hidden", contentClassName)}
      >
        {(title || description) ? (
          <DialogHeader className="shrink-0">
            {title ? <DialogTitle>{title}</DialogTitle> : null}
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
        ) : null}

        <div className="scrollbar-thin -mx-6 min-h-0 flex-1 overflow-y-auto px-6">
          {typeof children === "function" ? children({ close }) : children}
        </div>

        {footer ? <DialogFooter className="shrink-0">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

export {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};
