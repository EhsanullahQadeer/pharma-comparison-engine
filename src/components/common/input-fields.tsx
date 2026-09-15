"use client";

import { Eye, EyeOff } from "lucide-react";
import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Checkbox as BaseCheckbox } from "@/components/ui/checkbox";
import { Input as BaseInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select as BaseSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea as BaseTextarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type InputKind =
  | "text"
  | "email"
  | "number"
  | "datetime-local"
  | "password"
  | "checkbox"
  | "otp"
  | "select"
  | "textarea";

export type FieldProps = {
  label?: string;
  hideLabel?: boolean;
  error?: string;
  className?: string;
  inputClassName?: string;
  bare?: boolean;
};

export type TextFieldProps = FieldProps &
  Omit<ComponentProps<typeof BaseInput>, "type" | "id" | "className"> & {
    type?: "text" | "email" | "number" | "datetime-local";
    id?: string;
    preIcon?: ReactNode;
    preIconClassName?: string;
    postIcon?: ReactNode;
    postIconClassName?: string;
  };

export type PasswordFieldProps = FieldProps &
  Omit<ComponentProps<typeof BaseInput>, "type" | "id" | "className"> & {
    type: "password";
    id?: string;
  };

export type CheckboxFieldProps = Omit<FieldProps, "error"> & {
  type: "checkbox";
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  value?: boolean;
  onChange?: (checked: boolean) => void;
};

export type SelectFieldProps = FieldProps & {
  type: "select";
  id?: string;
  name?: string;
  options: { value: string; label: ReactNode }[];
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  preIcon?: ReactNode;
  preIconClassName?: string;
  postIcon?: ReactNode;
  postIconClassName?: string;
};

export type OtpFieldProps = FieldProps & {
  type: "otp";
  id?: string;
  name?: string;
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
};

export type TextareaFieldProps = FieldProps &
  Omit<ComponentProps<typeof BaseTextarea>, "id" | "className"> & {
    type: "textarea";
    id?: string;
    preIcon?: ReactNode;
    postIcon?: ReactNode;
  };

export type InputProps =
  | TextFieldProps
  | PasswordFieldProps
  | CheckboxFieldProps
  | OtpFieldProps
  | SelectFieldProps
  | TextareaFieldProps;

export function ControlFrame({
  id,
  label,
  hideLabel,
  error,
  className,
  errorClassName,
  children,
}: {
  id: string;
  label?: string;
  hideLabel?: boolean;
  error?: string;
  className?: string;
  errorClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <Label
          htmlFor={id}
          className={cn(
            "text-sm font-medium text-foreground",
            hideLabel && "sr-only",
          )}
        >
          {label}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className={cn("text-sm font-normal text-destructive", errorClassName)}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  hideLabel,
  error,
  className,
  inputClassName,
  bare,
  type = "text",
  id,
  preIcon,
  preIconClassName,
  postIcon,
  postIconClassName,
  ...props
}: Omit<TextFieldProps, "type"> & {
  type?: "text" | "email" | "number" | "datetime-local";
}) {
  const autoId = useId();
  const inputId = id ?? autoId;

  const control =
    preIcon || postIcon ? (
      <div className="relative">
        {preIcon ? (
          <span className={cn("absolute inset-y-0 left-0 flex w-10 items-center justify-center text-muted-foreground", preIconClassName)}>
            {preIcon}
          </span>
        ) : null}
        <BaseInput
          id={inputId}
          type={type}
          className={cn(preIcon && "pl-10", postIcon && "pr-10", inputClassName)}
          {...props}
        />
        {postIcon ? (
          <span className={cn("absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground", postIconClassName)}>
            {postIcon}
          </span>
        ) : null}
      </div>
    ) : (
      <BaseInput id={inputId} type={type} className={inputClassName} {...props} />
    );

  if (bare) return control;

  return (
    <ControlFrame id={inputId} label={label} hideLabel={hideLabel} error={error} className={className}>
      {control}
    </ControlFrame>
  );
}

export function PasswordField({
  label,
  hideLabel,
  error,
  className,
  inputClassName,
  bare,
  id,
  type: _type,
  ...props
}: PasswordFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [visible, setVisible] = useState(false);

  const control = (
    <div className="relative">
      <BaseInput
        id={inputId}
        type={visible ? "text" : "password"}
        className={cn("pr-11", inputClassName)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
      </button>
    </div>
  );

  if (bare) return control;

  return (
    <ControlFrame id={inputId} label={label} hideLabel={hideLabel} error={error} className={className}>
      {control}
    </ControlFrame>
  );
}

export function CheckboxField({
  label,
  className,
  inputClassName,
  bare,
  id,
  type: _type,
  value,
  onChange,
  ...props
}: CheckboxFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  const control = (
    <BaseCheckbox
      id={inputId}
      className={inputClassName}
      checked={value ?? false}
      onCheckedChange={onChange}
      {...props}
    />
  );

  if (bare) return control;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {control}
      {label ? (
        <Label htmlFor={inputId} className="text-sm font-normal text-muted-foreground">
          {label}
        </Label>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  hideLabel,
  error,
  className,
  inputClassName,
  bare,
  id,
  name,
  options,
  placeholder,
  value,
  onChange,
  disabled,
  preIcon,
  preIconClassName,
  postIcon,
  postIconClassName,
  type: _type,
}: SelectFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  const control = (
    <div className="relative">
      <BaseSelect name={name} value={value} onValueChange={(v) => onChange?.(v ?? "")} disabled={disabled}>
        <SelectTrigger
          id={inputId}
          className={cn(inputClassName, preIcon && "pl-10", postIcon && "pr-16")}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </BaseSelect>
      {preIcon ? (
        <span className={cn("pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 flex items-center justify-center text-muted-foreground", preIconClassName)}>
          {preIcon}
        </span>
      ) : null}
      {postIcon ? (
        <span className={cn("absolute right-3 top-1/2 z-10 -translate-y-1/2 flex items-center justify-center", postIconClassName)}>
          {postIcon}
        </span>
      ) : null}
    </div>
  );

  if (bare) {
    return (
      <>
        {control}
        {error ? <p className="mt-1 text-sm font-normal text-destructive">{error}</p> : null}
      </>
    );
  }

  return (
    <ControlFrame id={inputId} label={label} hideLabel={hideLabel} error={error} className={className}>
      {control}
    </ControlFrame>
  );
}

export function OtpField({
  label,
  hideLabel,
  error,
  className,
  inputClassName,
  bare,
  id,
  name,
  length = 6,
  value = "",
  onChange,
  onBlur,
  disabled,
  type: _type,
}: OtpFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const boxRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const focusBox = (index: number) => boxRefs.current[index]?.focus();

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const typed = event.target.value.replace(/\D/g, "");
    if (!typed) {
      const next = digits.slice();
      next[index] = "";
      onChange?.(next.join(""));
      return;
    }
    const next = digits.slice();
    typed.split("").forEach((char, offset) => {
      if (index + offset < length) next[index + offset] = char;
    });
    onChange?.(next.join(""));
    focusBox(Math.min(index + typed.length, length - 1));
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      const next = digits.slice();
      next[index - 1] = "";
      onChange?.(next.join(""));
      focusBox(index - 1);
    } else if (event.key === "ArrowLeft" && index > 0) {
      focusBox(index - 1);
    } else if (event.key === "ArrowRight" && index < length - 1) {
      focusBox(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    onChange?.(pasted);
    focusBox(Math.min(pasted.length, length - 1));
  };

  const control = (
    <div className="flex justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { boxRefs.current[index] = el; }}
          id={index === 0 ? inputId : undefined}
          name={index === 0 ? name : undefined}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          onPaste={handlePaste}
          onBlur={index === length - 1 ? onBlur : undefined}
          aria-label={`Digit ${index + 1} of ${length}`}
          className={cn(
            "h-12 w-12 rounded-2xl border border-transparent bg-background text-center text-lg font-normal text-foreground shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:h-14 sm:w-14",
            inputClassName,
          )}
        />
      ))}
    </div>
  );

  if (bare) return control;

  return (
    <ControlFrame id={inputId} label={label} hideLabel={hideLabel} error={error} className={className} errorClassName="text-center">
      {control}
    </ControlFrame>
  );
}

export function TextareaField({
  label,
  hideLabel,
  error,
  className,
  inputClassName,
  bare,
  id,
  preIcon,
  postIcon,
  type: _type,
  ...props
}: TextareaFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  const control =
    preIcon || postIcon ? (
      <div className={cn("relative", className)}>
        {preIcon ? (
          <span className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground">
            {preIcon}
          </span>
        ) : null}
        <BaseTextarea
          id={inputId}
          className={cn(preIcon && "pl-10", postIcon && "pr-10", inputClassName)}
          {...props}
        />
        {postIcon ? (
          <span className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground">
            {postIcon}
          </span>
        ) : null}
      </div>
    ) : (
      <BaseTextarea id={inputId} className={inputClassName} {...props} />
    );

  if (bare) return control;

  return (
    <ControlFrame id={inputId} label={label} hideLabel={hideLabel} error={error} className={className}>
      {control}
    </ControlFrame>
  );
}
