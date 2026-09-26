"use client";

import { useState, useTransition } from "react";

import { setAffiliateProgrammeStatus } from "@/actions/referrals/programmes";
import InputField from "@/components/common/input";
import type { AffiliateProgrammeStatus } from "@/generated/prisma/client";
import { useRouter } from "@/hooks/useRouter";
import { confirm } from "@/lib/confirm-store";
import { affiliateProgrammeStatusHints, affiliateProgrammeStatusLabels } from "@/lib/referral-labels";

const statusOptions = (Object.keys(affiliateProgrammeStatusLabels) as AffiliateProgrammeStatus[]).map((value) => ({ value, label: affiliateProgrammeStatusLabels[value] }));

// Going live or coming off live changes where real visitors are sent, so both ask first.
function confirmation(from: AffiliateProgrammeStatus, to: AffiliateProgrammeStatus) {
  if (to === "ACTIVE") return { title: "Activate this programme?", message: "Clicks on this pharmacy's prices will go through the tracked link, the pharmacy will be marked as an affiliate partner, and it will be listed as a partner on the public independence page.", confirmText: "Activate" };
  if (from === "ACTIVE") return { title: "Take this programme off?", message: "Clicks will go straight to the product page with no tracking. The pharmacy stays marked as a partner until you untick that separately.", confirmText: "Change status" };
  return null;
}

export function AffiliateProgrammeStatusControl({ providerId, status }: { providerId: string; status: AffiliateProgrammeStatus }) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  async function handleChange(value: string) {
    const next = value as AffiliateProgrammeStatus;
    if (next === current) return;
    const ask = confirmation(current, next);
    if (ask && !(await confirm(ask))) return;
    setError(undefined);
    startTransition(async () => {
      const result = await setAffiliateProgrammeStatus(providerId, next);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCurrent(next);
      router.refresh();
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="affiliate-programme-status" className="text-sm font-medium">Programme status</label>
        <div className="w-40">
          <InputField type="select" bare id="affiliate-programme-status" value={current} onChange={handleChange} options={statusOptions} disabled={isPending} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{affiliateProgrammeStatusHints[current]}</p>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
