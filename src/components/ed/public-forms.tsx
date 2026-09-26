"use client";

import { submitContactMessage, submitCorrectionRequest, submitPharmacySuggestion } from "@/actions/submissions/public-submissions";
import { contactMessageSchema, contactTopics, correctionRequestSchema, pharmacySuggestionSchema } from "@/actions/submissions/submission-schemas";
import { FormFeilds } from "@/components/common/form";
import InputField from "@/components/common/input";
import { PublicForm } from "@/components/ed/public-form";

import type { ReactNode } from "react";

// A single labelled, validated field — every public form field goes through FormFeilds.
function Field({ name, label, required, hint, children }: { name: string; label: string; required?: boolean; hint?: string; children: (field: Parameters<Parameters<typeof FormFeilds>[0]["children"]>[0]) => ReactNode }) {
  return (
    <FormFeilds fieldProps={{ name }} label={{ text: label }} required={required}>
      {(field) => (
        <>
          {children(field)}
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </>
      )}
    </FormFeilds>
  );
}

export function PharmacySuggestionForm() {
  return (
    <PublicForm
      schema={pharmacySuggestionSchema}
      action={submitPharmacySuggestion}
      defaultValues={{ pharmacyName: "", websiteUrl: "", regulatorReference: "", message: "", email: "" }}
      submitLabel="Send suggestion"
      success={{ title: "Thanks, we've got your suggestion", body: "We'll check the pharmacy's registration and ED service before it can appear in the directory." }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="pharmacyName" label="Pharmacy name" required>{(field) => <InputField type="text" bare {...field} value={field.value ?? ""} autoComplete="organization" />}</Field>
        <Field name="websiteUrl" label="Website" required>{(field) => <InputField type="text" bare {...field} value={field.value ?? ""} inputMode="url" placeholder="https://" />}</Field>
      </div>
      <Field name="regulatorReference" label="GPhC or PSNI registration number" hint="Optional. Usually shown in the website's footer.">{(field) => <InputField type="text" bare {...field} value={field.value ?? ""} />}</Field>
      <Field name="message" label="Anything else we should know?">{(field) => <InputField type="textarea" bare {...field} value={field.value ?? ""} rows={4} />}</Field>
      <Field name="email" label="Your email" hint="Optional. Only if you'd like us to let you know the outcome.">{(field) => <InputField type="email" bare {...field} value={field.value ?? ""} autoComplete="email" />}</Field>
    </PublicForm>
  );
}

export function CorrectionRequestForm({ pharmacies, defaultPharmacy }: { pharmacies: { value: string; label: string }[]; defaultPharmacy?: string }) {
  return (
    <PublicForm
      schema={correctionRequestSchema}
      action={submitCorrectionRequest}
      defaultValues={{ pharmacySlug: defaultPharmacy ?? "", pageUrl: "", message: "", email: "" }}
      submitLabel="Send correction"
      success={{ title: "Thanks, your correction is with our team", body: "A member of staff will check it against the pharmacy's own information and update the listing if needed." }}
    >
      <Field name="pharmacySlug" label="Which pharmacy?" hint="Leave blank if it's about something else on the site.">
        {(field) => <InputField type="select" bare id={field.id} name={field.name} value={field.value ?? ""} onChange={field.onChange} options={pharmacies} placeholder="Choose a pharmacy" />}
      </Field>
      <Field name="pageUrl" label="Page address" hint="Optional. The link to the page with the mistake.">{(field) => <InputField type="text" bare {...field} value={field.value ?? ""} inputMode="url" />}</Field>
      <Field name="message" label="What's wrong?" required>{(field) => <InputField type="textarea" bare {...field} value={field.value ?? ""} rows={5} placeholder="For example: the 50mg × 4 price is now £24.99, and delivery is free." />}</Field>
      <Field name="email" label="Your email" hint="Optional. If you're from the pharmacy, use your work email so we can verify you.">{(field) => <InputField type="email" bare {...field} value={field.value ?? ""} autoComplete="email" />}</Field>
    </PublicForm>
  );
}

const topicLabels: Record<(typeof contactTopics)[number], string> = {
  general: "A general question",
  listing: "A listing or price",
  pharmacy: "I work for a pharmacy",
  press: "Press or partnership",
};
const topicOptions = contactTopics.map((value) => ({ value, label: topicLabels[value] }));

export function ContactForm() {
  return (
    <PublicForm
      schema={contactMessageSchema}
      action={submitContactMessage}
      defaultValues={{ name: "", email: "", topic: "", message: "" }}
      submitLabel="Send message"
      success={{ title: "Thanks, your message has been sent", body: "We'll reply to the email address you gave us." }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="name" label="Your name">{(field) => <InputField type="text" bare {...field} value={field.value ?? ""} autoComplete="name" />}</Field>
        <Field name="email" label="Your email" required>{(field) => <InputField type="email" bare {...field} value={field.value ?? ""} autoComplete="email" />}</Field>
      </div>
      <Field name="topic" label="What's it about?" required>
        {(field) => <InputField type="select" bare id={field.id} name={field.name} value={field.value ?? ""} onChange={field.onChange} options={topicOptions} placeholder="Choose a topic" />}
      </Field>
      <Field name="message" label="Message" required>{(field) => <InputField type="textarea" bare {...field} value={field.value ?? ""} rows={6} />}</Field>
    </PublicForm>
  );
}
