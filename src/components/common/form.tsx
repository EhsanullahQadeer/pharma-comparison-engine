"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { type ReactNode } from "react";
import {
  Controller,
  type ControllerRenderProps,
  type FieldValues,
  FormProvider,
  useForm,
  useFormContext,
  type DefaultValues,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form";
import { type ZodType } from "zod";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn, scrollToFirstInvalidField } from "@/lib/utils";

type FormFieldProps = ControllerRenderProps<FieldValues, string> & {
  id: string;
  "aria-invalid": boolean;
};

export const FormFeilds = ({
  children,
  fieldProps,
  label,
  required,
}: {
  children: (field: FormFieldProps, form?: UseFormReturn<FieldValues>) => React.ReactNode;
  fieldProps: { name: string; className?: string };
  label?: { text: string | ReactNode; className?: string };
  required?: boolean;
}) => {
  const form = useFormContext<FieldValues>();
  return (
    <Controller
      control={form.control}
      name={fieldProps.name as never}
      render={({ field, fieldState }: { field: ControllerRenderProps<FieldValues, string>; fieldState: { invalid: boolean; error?: { message?: string } } }) => (
        <Field className={cn("form-field", fieldProps.className)} data-invalid={fieldState.invalid}>
          {label?.text ? (
            <FieldLabel htmlFor={field.name} className={cn("form-label", label?.className)}>
              {label.text}
              {required ? <span className="ml-1 text-destructive">*</span> : null}
            </FieldLabel>
          ) : null}
          {children(
            { ...field, id: field.name, "aria-invalid": fieldState.invalid },
            form
          )}
          {fieldState.invalid ? <FieldError className="form-error" errors={[fieldState.error]} /> : null}
        </Field>
      )}
    />
  );
};

const FORM = React.forwardRef<HTMLFormElement, {
  onSubmit: (value: FieldValues) => Promise<{ status?: number } | void> | { status?: number } | void;
  children: ReactNode;
  className?: string;
  schema?: ZodType<FieldValues>;
  defaultValues?: DefaultValues<FieldValues>;
  customForm?: UseFormReturn<FieldValues>;
}>(({
  onSubmit,
  children,
  className,
  schema,
  defaultValues,
  customForm,
}, ref) => {
  const internalForm = useForm<FieldValues>({
    resolver: schema ? zodResolver(schema as never) : undefined,
    defaultValues,
  });

  const form = customForm ?? internalForm;

  const onError = (errors: FieldValues) => {
    scrollToFirstInvalidField(errors);
  };

  const handleSubmit: SubmitHandler<FieldValues> = async (data: FieldValues) => {
    try {
      const res = await onSubmit(data);
      if (res?.status === 200) {
        form.reset();
      }
    } catch (error) {
      console.error("Submission error", error);
    }
  };

  const wrappedSubmit = form.handleSubmit(handleSubmit, onError);

  return (
    <FormProvider {...form}>
      <form ref={ref} onSubmit={wrappedSubmit} className={cn("flex flex-col gap-4", className)}>
        {children}
      </form>
    </FormProvider>
  );
});

FORM.displayName = "FORM";

export default FORM;

// Raw shadcn form primitives re-exported for consumers that still use the
// plain `@/components/ui/form` API — one file, both FORM/FormFeilds and the
// raw Form/FormField/... components stay in sync with ui/form.
export {
  useFormField,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
