"use client";

import { Pencil, Plus } from "lucide-react";
import { useActionState, useState } from "react";

import { createDiscoverySource, updateDiscoverySource, type CreateDiscoverySourceState, type UpdateDiscoverySourceState } from "@/actions/discovery/discovery-sources";
import { Button } from "@/components/common/button";
import { Label } from "@/components/common/label";
import Modal, { DialogContent, DialogHeader, DialogTitle } from "@/components/common/modal";
import type { DiscoverySource, DiscoverySourceType } from "@/generated/prisma/client";
import { useCloseModalOnSuccess } from "@/hooks/useCloseModalOnSuccess";
import { discoverySourceCredentialFields } from "@/lib/discovery-credential-fields";
import { discoveryCadenceLabels, discoveryCadenceValues, discoverySourceTypeLabels } from "@/lib/discovery-labels";

type SourceForEdit = Pick<DiscoverySource, "id" | "type" | "cadence" | "enabled" | "configuredCredentialKeys">;

function CredentialFields({ type, configuredKeys }: { type: DiscoverySourceType; configuredKeys: string[] }) {
  const fields = discoverySourceCredentialFields[type];
  if (fields.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">API credentials — stored encrypted. Leave a field blank to keep its current value.</p>
      {fields.map(({ key, label }) => (
        <div key={key} className="space-y-1.5">
          <Label htmlFor={`cred_${key}`}>{label}</Label>
          <input
            id={`cred_${key}`}
            name={`cred_${key}`}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            data-bwignore
            placeholder={configuredKeys.includes(key) ? "Configured — leave blank to keep" : "Not set"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>
      ))}
    </div>
  );
}

function EditDiscoverySourceForm({ source, onClose }: { source: SourceForEdit; onClose: () => void }) {
  const initialState: UpdateDiscoverySourceState = {};
  const [state, formAction, pending] = useActionState(updateDiscoverySource.bind(null, source.id), initialState);
  useCloseModalOnSuccess(state, pending, onClose);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cadence">Fetch cadence</Label>
        <select
          id="cadence"
          name="cadence"
          required
          defaultValue={source.cadence}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {discoveryCadenceValues.map((value) => (
            <option key={value} value={value}>{discoveryCadenceLabels[value]}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={source.enabled} className="size-4 rounded border-input" />
        Enabled
      </label>
      <CredentialFields type={source.type} configuredKeys={source.configuredCredentialKeys} />
      {!!state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}

export function EditDiscoverySourceModal({ source }: { source: SourceForEdit }) {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="ghost" size="icon-sm">
          <Pencil aria-hidden="true" className="size-4" />
          <span className="sr-only">Edit {discoverySourceTypeLabels[source.type]}</span>
        </Button>
      }
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {discoverySourceTypeLabels[source.type]}</DialogTitle>
        </DialogHeader>
        <EditDiscoverySourceForm source={source} onClose={() => setOpen(false)} />
      </DialogContent>
    </Modal>
  );
}

function CreateDiscoverySourceForm({ availableTypes, onClose }: { availableTypes: DiscoverySourceType[]; onClose: () => void }) {
  const initialState: CreateDiscoverySourceState = {};
  const [state, formAction, pending] = useActionState(createDiscoverySource, initialState);
  const [type, setType] = useState<DiscoverySourceType>(availableTypes[0]);
  useCloseModalOnSuccess(state, pending, onClose);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="type">Source</Label>
        <select
          id="type"
          name="type"
          required
          value={type}
          onChange={(event) => setType(event.target.value as DiscoverySourceType)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {availableTypes.map((value) => (
            <option key={value} value={value}>{discoverySourceTypeLabels[value]}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cadence">Fetch cadence</Label>
        <select
          id="cadence"
          name="cadence"
          required
          defaultValue={discoveryCadenceValues[1]}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {discoveryCadenceValues.map((value) => (
            <option key={value} value={value}>{discoveryCadenceLabels[value]}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" className="size-4 rounded border-input" />
        Enabled
      </label>
      <CredentialFields type={type} configuredKeys={[]} />
      {!!state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add source"}</Button>
      </div>
    </form>
  );
}

export function CreateDiscoverySourceModal({ availableTypes }: { availableTypes: DiscoverySourceType[] }) {
  const [open, setOpen] = useState(false);

  if (availableTypes.length === 0) {
    return (
      <Button type="button" disabled title="Every known source already has a row — a new one needs adapter code first">
        <Plus aria-hidden="true" className="size-4" />
        Add source
      </Button>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button">
          <Plus aria-hidden="true" className="size-4" />
          Add source
        </Button>
      }
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a discovery source</DialogTitle>
        </DialogHeader>
        <CreateDiscoverySourceForm availableTypes={availableTypes} onClose={() => setOpen(false)} />
      </DialogContent>
    </Modal>
  );
}
