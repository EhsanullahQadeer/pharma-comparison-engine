"use client";

import { useEffect } from "react";

import {
  type InputKind,
  type InputProps,
  type TextFieldProps,
  type PasswordFieldProps,
  type CheckboxFieldProps,
  type OtpFieldProps,
  type SelectFieldProps,
  type TextareaFieldProps,
  TextField,
  PasswordField,
  CheckboxField,
  SelectField,
  OtpField,
  TextareaField,
} from "@/components/common/input-fields";

export type { InputProps } from "@/components/common/input-fields";

const renderers: Record<InputKind, (props: InputProps) => React.ReactNode> = {
  text: (props) => <TextField {...(props as TextFieldProps)} />,
  email: (props) => <TextField {...(props as TextFieldProps)} />,
  number: (props) => <TextField {...(props as TextFieldProps)} />,
  "datetime-local": (props) => <TextField {...(props as TextFieldProps)} />,
  password: (props) => <PasswordField {...(props as PasswordFieldProps)} />,
  checkbox: (props) => <CheckboxField {...(props as CheckboxFieldProps)} />,
  otp: (props) => <OtpField {...(props as OtpFieldProps)} />,
  select: (props) => <SelectField {...(props as SelectFieldProps)} />,
  textarea: (props) => <TextareaField {...(props as TextareaFieldProps)} />,
};

export default function InputField(props: InputProps) {
  const kind: InputKind = props.type ?? "text";

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLInputElement;
      if (target?.type === "number") target.blur();
    };
    document.addEventListener("wheel", handleWheel, { passive: true });
    return () => document.removeEventListener("wheel", handleWheel);
  }, []);

  const Render = renderers[kind];
  return <Render {...props} />;
}

export { Input } from "@/components/ui/input";
