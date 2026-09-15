"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ProviderForm } from "@/components/admin/provider-form";
import { Button } from "@/components/common/button";
import Modal, { DialogContent, DialogHeader, DialogTitle } from "@/components/common/modal";

export function AddPharmacyModal({ triggerClassName }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" className={triggerClassName}>
          <Plus aria-hidden="true" className="size-4" />
          Add pharmacy
        </Button>
      }
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a pharmacy</DialogTitle>
        </DialogHeader>
        <ProviderForm />
      </DialogContent>
    </Modal>
  );
}
