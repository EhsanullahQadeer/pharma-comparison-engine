import { cn } from "cn"
import * as React from "react"

function Field({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("space-y-1.5", className)}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="field-label"
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    />
  )
}

function FieldError({
  className,
  errors,
  ...props
}: React.ComponentProps<"p"> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const message = errors?.[0]?.message
  if (!message) return null

  return (
    <p
      data-slot="field-error"
      className={cn("text-sm font-normal text-destructive", className)}
      {...props}
    >
      {message}
    </p>
  )
}

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Field, FieldLabel, FieldError, FieldDescription }
