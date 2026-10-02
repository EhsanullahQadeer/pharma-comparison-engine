"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "cn"
import * as React from "react"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Popup>,
  React.ComponentProps<typeof TooltipPrimitive.Popup> & { sideOffset?: number }
>(({ className, sideOffset, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    {/* The positioner is the positioned element, so the stacking order has to be set here: on the
        popup it has no effect and the tooltip slides under sticky table headings. */}
    <TooltipPrimitive.Positioner sideOffset={sideOffset} className="isolate z-50">
      <TooltipPrimitive.Popup
        ref={ref}
        className={cn(
          "overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Positioner>
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
