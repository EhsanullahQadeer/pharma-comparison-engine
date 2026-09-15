"use client";

import { Pencil, Plus } from "lucide-react";
import { useActionState, useState } from "react";

import { createStaffUser, updateStaffUser, type CreateStaffState, type UpdateStaffState } from "@/actions/staff/staff";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import Modal, { DialogContent, DialogHeader, DialogTitle } from "@/components/common/modal";
import type { StaffUser } from "@/generated/prisma/client";
import { useCloseModalOnSuccess } from "@/hooks/useCloseModalOnSuccess";
import { staffRoleLabels } from "@/lib/staff-role-labels";

const staffRoleValues = Object.keys(staffRoleLabels) as (keyof typeof staffRoleLabels)[];

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

function CreateStaffForm({ onClose }: { onClose: () => void }) {
  const initialState: CreateStaffState = {};
  const [state, formAction, pending] = useActionState(createStaffUser, initialState);
  useCloseModalOnSuccess(state, pending, onClose);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
        <FieldError messages={state.fieldErrors?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
        <FieldError messages={state.fieldErrors?.email} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Temporary password</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
        <FieldError messages={state.fieldErrors?.password} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          required
          defaultValue={staffRoleValues[0]}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {staffRoleValues.map((value) => (
            <option key={value} value={value}>{staffRoleLabels[value]}</option>
          ))}
        </select>
      </div>
      {!!state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create staff account"}</Button>
      </div>
    </form>
  );
}

function EditStaffForm({ staffUser, onClose }: { staffUser: StaffUser; onClose: () => void }) {
  const initialState: UpdateStaffState = {};
  const [state, formAction, pending] = useActionState(updateStaffUser.bind(null, staffUser.id), initialState);
  useCloseModalOnSuccess(state, pending, onClose);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={staffUser.name} required />
        <FieldError messages={state.fieldErrors?.name} />
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input value={staffUser.email} disabled />
        <p className="text-xs text-muted-foreground">Email can&apos;t be changed here.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Reset password (optional)</Label>
        <Input id="password" name="password" type="password" minLength={8} placeholder="Leave blank to keep the current password" />
        <FieldError messages={state.fieldErrors?.password} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          required
          defaultValue={staffUser.role}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {staffRoleValues.map((value) => (
            <option key={value} value={value}>{staffRoleLabels[value]}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={staffUser.active} className="size-4 rounded border-input" />
        Active (can sign in)
      </label>
      {!!state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}

export function AddStaffModal() {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button">
          <Plus aria-hidden="true" className="size-4" />
          Add staff
        </Button>
      }
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a staff account</DialogTitle>
        </DialogHeader>
        <CreateStaffForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Modal>
  );
}

export function EditStaffModal({ staffUser }: { staffUser: StaffUser }) {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="ghost" size="icon-sm">
          <Pencil aria-hidden="true" className="size-4" />
          <span className="sr-only">Edit staff account</span>
        </Button>
      }
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {staffUser.name}</DialogTitle>
        </DialogHeader>
        <EditStaffForm staffUser={staffUser} onClose={() => setOpen(false)} />
      </DialogContent>
    </Modal>
  );
}
