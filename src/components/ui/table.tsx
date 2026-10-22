"use client"

import { cn } from "cn"
import * as React from "react"

function Table({ className, container, ...props }: React.ComponentProps<"table"> & { container?: React.ComponentProps<"div"> }) {
  return (
    <div className="relative w-full overflow-hidden rounded-b-xl border border-border bg-card">
      <div data-slot="table-container" {...container} className={cn("w-full overflow-x-auto [scrollbar-color:color-mix(in_oklab,var(--muted-foreground)_50%,transparent)_transparent] scrollbar-thin", container?.className)}>
        <table
          data-slot="table"
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "bg-muted [&_tr]:border-b [&_tr]:hover:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(
        "[&_tr:last-child]:border-0 [&_tr:last-child>*:first-child]:rounded-bl-xl [&_tr:last-child>*:last-child]:rounded-br-xl",
        className
      )}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t-2 border-border bg-muted/40 font-semibold text-foreground [&>tr]:last:border-b-0 [&>tr]:hover:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border/70 transition-colors hover:bg-muted/40 has-aria-expanded:bg-muted/40 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-11 px-4 in-data-[density=compact]:h-8 in-data-[density=compact]:px-3 in-data-[density=compact]:text-xs text-left align-middle text-sm font-medium whitespace-nowrap text-muted-foreground has-[[role=checkbox]]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-4 py-3.5 in-data-[density=compact]:px-3 in-data-[density=compact]:py-1.5 align-middle whitespace-nowrap has-[[role=checkbox]]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
