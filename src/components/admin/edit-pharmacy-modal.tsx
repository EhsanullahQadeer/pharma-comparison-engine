"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { ProviderForm } from "@/components/admin/provider-form";
import { Button } from "@/components/common/button";
import Modal, { DialogContent, DialogHeader, DialogTitle } from "@/components/common/modal";
import type { Provider } from "@/generated/prisma/client";

type EditPharmacyModalProps = {
  provider: Pick<
    Provider,
    "id" | "tradingName" | "legalName" | "websiteDomain" | "regulatorType" | "regulatorReference" | "dispensingPartnerName" | "serviceRegions"
  >;
};

export function EditPharmacyModal({ provider }: EditPharmacyModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="outline">
          <Pencil aria-hidden="true" className="size-4" />
          Edit details
        </Button>
      }
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {provider.tradingName}</DialogTitle>
        </DialogHeader>
        <ProviderForm provider={provider} />
      </DialogContent>
    </Modal>
  );
}
