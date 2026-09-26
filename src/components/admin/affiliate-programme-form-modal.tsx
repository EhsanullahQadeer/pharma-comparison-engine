"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { affiliateProgrammeFormSchema } from "@/actions/referrals/programme-schema";
import type { AffiliateProgrammeFormValues } from "@/actions/referrals/programme-schema";
import { saveAffiliateProgramme } from "@/actions/referrals/programmes";
import { Button } from "@/components/common/button";
import FORM, { FormFeilds } from "@/components/common/form";
import InputField from "@/components/common/input";
import Modal, { DialogContent, DialogHeader, DialogTitle } from "@/components/common/modal";
import { useRouter } from "@/hooks/useRouter";
import { affiliateNetworkLabels, affiliateNetworkValues, commissionBasisLabels, commissionBasisValues } from "@/lib/referral-labels";

import type { FieldValues } from "react-hook-form";

const networkOptions = affiliateNetworkValues.map((value) => ({ value, label: affiliateNetworkLabels[value] }));
const basisOptions = commissionBasisValues.map((value) => ({ value, label: commissionBasisLabels[value] }));
const TEMPLATE_HINT = "Use {url} for the product page (encoded, e.g. Awin's ued=), or start with {rawUrl} for a direct deal that adds its own parameter. {clickRef} adds our click id. Nothing else about the visitor is ever sent.";

function ProgrammeForm({ providerId, defaultValues, onClose }: { providerId: string; defaultValues: AffiliateProgrammeFormValues; onClose: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<{ pending: boolean; error?: string }>({ pending: false });

  const handleSubmit = useCallback(async (values: FieldValues) => {
    setState({ pending: true });
    const result = await saveAffiliateProgramme(providerId, values as AffiliateProgrammeFormValues);
    setState({ pending: false, error: result.error });
    if (!result.error) {
      onClose();
      router.refresh();
    }
  }, [providerId, onClose, router]);

  return (
    <FORM schema={affiliateProgrammeFormSchema} defaultValues={defaultValues} onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormFeilds fieldProps={{ name: "network" }} label={{ text: "Network" }} required>
          {(field) => <InputField type="select" bare id={field.id} name={field.name} value={field.value ?? ""} onChange={field.onChange} options={networkOptions} />}
        </FormFeilds>
        <FormFeilds fieldProps={{ name: "networkMerchantId" }} label={{ text: "Merchant / advertiser ID" }}>
          {(field) => <InputField type="text" bare {...field} value={field.value ?? ""} />}
        </FormFeilds>
      </div>
      <FormFeilds fieldProps={{ name: "linkTemplate" }} label={{ text: "Tracked link template" }} required>
        {(field) => <InputField type="textarea" bare {...field} value={field.value ?? ""} rows={3} inputClassName="font-mono text-xs" placeholder="https://www.awin1.com/cread.php?awinmid=…&awinaffid=…&clickref={clickRef}&ued={url}" />}
      </FormFeilds>
      <p className="-mt-2 text-xs text-muted-foreground">{TEMPLATE_HINT}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormFeilds fieldProps={{ name: "commissionBasis", className: "sm:col-span-2" }} label={{ text: "Commission" }} required>
          {(field) => <InputField type="select" bare id={field.id} name={field.name} value={field.value ?? ""} onChange={field.onChange} options={basisOptions} />}
        </FormFeilds>
        <FormFeilds fieldProps={{ name: "commissionAmount" }} label={{ text: "Amount" }} required>
          {(field) => <InputField type="text" bare {...field} value={field.value ?? ""} inputMode="decimal" placeholder="8.00" />}
        </FormFeilds>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormFeilds fieldProps={{ name: "attributionDays" }} label={{ text: "Attribution window (days)" }}>
          {(field) => <InputField type="text" bare {...field} value={field.value ?? ""} inputMode="numeric" placeholder="30" />}
        </FormFeilds>
        <FormFeilds fieldProps={{ name: "termsUrl", className: "sm:col-span-2" }} label={{ text: "Programme terms (link)" }}>
          {(field) => <InputField type="text" bare {...field} value={field.value ?? ""} placeholder="https://…" />}
        </FormFeilds>
      </div>
      <FormFeilds fieldProps={{ name: "termsNotes" }} label={{ text: "Terms notes (exclusions, refunds, repeat orders, payment timing)" }}>
        {(field) => <InputField type="textarea" bare {...field} value={field.value ?? ""} rows={3} />}
      </FormFeilds>
      <FormFeilds fieldProps={{ name: "pomPromotionPermitted" }}>
        {(field) => (
          <div className="flex items-start gap-2 rounded-lg border border-border p-3">
            <InputField type="checkbox" bare id={field.id} name={field.name} value={field.value ?? false} onChange={field.onChange} />
            <label htmlFor={field.id} className="text-sm">
              The programme&apos;s terms allow us to compare prescription-only ED medicines (sildenafil, tadalafil).
              <span className="mt-0.5 block text-xs text-muted-foreground">Required before the programme can be made active. Many pharmacy programmes forbid promoting prescription medicines.</span>
            </label>
          </div>
        )}
      </FormFeilds>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={state.pending}>
          {state.pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          Save programme
        </Button>
      </div>
    </FORM>
  );
}

export function AffiliateProgrammeFormModal({ providerId, providerName, defaultValues, isNew }: {
  providerId: string;
  providerName: string;
  defaultValues: AffiliateProgrammeFormValues;
  isNew: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const trigger = useMemo(() => (
    <Button type="button" variant={isNew ? "default" : "outline"} size="sm">
      {isNew ? <Plus aria-hidden="true" className="size-4" /> : <Pencil aria-hidden="true" className="size-4" />}
      {isNew ? "Add programme" : "Edit programme"}
    </Button>
  ), [isNew]);

  return (
    <Modal open={open} onOpenChange={setOpen} trigger={trigger}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add" : "Edit"} affiliate programme — {providerName}</DialogTitle>
        </DialogHeader>
        <ProgrammeForm providerId={providerId} defaultValues={defaultValues} onClose={close} />
      </DialogContent>
    </Modal>
  );
}
