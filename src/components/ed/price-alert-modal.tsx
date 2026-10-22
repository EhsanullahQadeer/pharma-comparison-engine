"use client";

import { BellRing } from "lucide-react";
import { useMemo } from "react";

import { priceAlertSchema } from "@/actions/price-alerts/price-alert-schema";
import { createPriceAlert } from "@/actions/price-alerts/price-alerts";
import { Button } from "@/components/common/button";
import { FormFeilds } from "@/components/common/form";
import InputField from "@/components/common/input";
import Modal, { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/common/modal";
import { toolbarButton } from "@/components/ed/price-grid-controls";
import { PublicForm } from "@/components/ed/public-form";
import Link from "@/components/Link";
import { formatPence } from "@/lib/money";
import { alertTargetKey } from "@/lib/price-alerts";
import type { PriceAlertOption } from "@/types/price-alerts";

// "Email me when the price drops": one strength × pack of this product, a target price and an
// email address. Nothing is sent but a confirmation until the visitor confirms from that email.
export function PriceAlertModal({ productSlug, productName, options, defaultTarget }: { productSlug: string; productName: string; options: PriceAlertOption[]; defaultTarget?: string }) {
  const selectOptions = useMemo(
    () => options.map((option) => ({ value: alertTargetKey(option.strengthMg, option.packQuantity), label: `${option.strengthMg}mg × ${option.packQuantity} (now from ${formatPence(option.lowestPence)})` })),
    [options],
  );
  const target = selectOptions.some((option) => option.value === defaultTarget) ? defaultTarget : selectOptions[0]?.value;
  const trigger = useMemo(() => (
    <Button type="button" size="sm" variant="outline" className={toolbarButton}>
      <BellRing aria-hidden="true" className="size-4" />
      Price alert
    </Button>
  ), []);

  return (
    <Modal trigger={trigger}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Email me when the price drops</DialogTitle>
          <DialogDescription>{productName}: we&apos;ll email you when the cheapest price, including delivery, reaches your target. At most one email a day.</DialogDescription>
        </DialogHeader>
        <PublicForm
          schema={priceAlertSchema}
          action={createPriceAlert}
          defaultValues={{ productSlug, target, threshold: "", email: "" }}
          submitLabel="Set up alert"
          success={{ title: "Check your email", body: "We've sent you a link to confirm the alert. Nothing else is sent until you confirm, and we delete your address if you don't within 48 hours." }}
        >
          <FormFeilds fieldProps={{ name: "target" }} label={{ text: "Strength and pack" }} required>
            {(field) => <InputField type="select" bare id={field.id} name={field.name} value={field.value ?? ""} onChange={field.onChange} options={selectOptions} />}
          </FormFeilds>
          <FormFeilds fieldProps={{ name: "threshold" }} label={{ text: "Email me at or below (£)" }} required>
            {(field) => <InputField type="text" bare {...field} value={field.value ?? ""} inputMode="decimal" placeholder="12.50" />}
          </FormFeilds>
          <FormFeilds fieldProps={{ name: "email" }} label={{ text: "Your email" }} required>
            {(field) => <InputField type="email" bare {...field} value={field.value ?? ""} autoComplete="email" />}
          </FormFeilds>
          <p className="text-xs text-muted-foreground">We only use your address for this alert, and delete it when you stop the alert or after a year. See our <Link href="/ed/privacy#price-alerts" className="underline underline-offset-4">privacy notice</Link>.</p>
        </PublicForm>
      </DialogContent>
    </Modal>
  );
}
