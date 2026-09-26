"use client";

import { Trophy } from "lucide-react";
import { useCallback, useState } from "react";

import InputField from "@/components/common/input";
import { deliveredTotalPence, perTabletPence } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { cn } from "@/lib/utils";

type PackInput = { price: string; tablets: string; delivery: string; consultation: string; other: string };
type PackKey = keyof PackInput;

const emptyPack: PackInput = { price: "", tablets: "", delivery: "", consultation: "", other: "" };

const FIELDS: { key: PackKey; label: string; step: string }[] = [
  { key: "price", label: "Pack price (£)", step: "0.01" },
  { key: "tablets", label: "Tablets in the pack", step: "1" },
  { key: "delivery", label: "Delivery (£)", step: "0.01" },
  { key: "consultation", label: "Consultation fee (£)", step: "0.01" },
  { key: "other", label: "Other required fees (£)", step: "0.01" },
];

const toPence = (value: string) => Math.max(0, Math.round((Number.parseFloat(value) || 0) * 100));

// Same integer-pence formula the comparison pages use, so the calculator and the site always agree.
function calculate(pack: PackInput) {
  const tablets = Number.parseInt(pack.tablets, 10);
  if (!pack.price || !Number.isInteger(tablets) || tablets <= 0) return null;
  const total = deliveredTotalPence({ itemPricePence: toPence(pack.price), deliveryFeePence: toPence(pack.delivery), consultationFeePence: toPence(pack.consultation), otherMandatoryFeesPence: toPence(pack.other) });
  return { total, perTablet: perTabletPence(total, tablets) };
}

type PackResult = ReturnType<typeof calculate>;

function cheaperIndex(a: PackResult, b: PackResult) {
  if (!a || !b || a.perTablet === b.perTablet) return null;
  return a.perTablet < b.perTablet ? 0 : 1;
}

export function PackCostCalculator() {
  const [packs, setPacks] = useState<[PackInput, PackInput]>([emptyPack, emptyPack]);
  const update = useCallback((index: 0 | 1, key: PackKey, value: string) => {
    setPacks((current) => {
      const next: [PackInput, PackInput] = [...current];
      next[index] = { ...current[index], [key]: value };
      return next;
    });
  }, []);

  const results = [calculate(packs[0]), calculate(packs[1])] as const;
  const winner = cheaperIndex(results[0], results[1]);

  return (
    <div className="mt-10 grid gap-5 lg:grid-cols-2">
      {([0, 1] as const).map((index) => {
        const result = results[index];
        const wins = winner === index;
        return (
          <section key={index} aria-labelledby={`pack-${index}`} className={cn("relative rounded-3xl border bg-card p-6 shadow-(--shadow) transition-all duration-300", wins ? "border-primary/60 ring-1 ring-primary/30" : "border-border")}>
            {wins ? <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground motion-safe:animate-fade-up"><Trophy aria-hidden="true" className="size-3.5" />Cheaper per tablet</span> : null}
            <h2 id={`pack-${index}`} className="text-lg font-semibold">Pack {index === 0 ? "A" : "B"}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <InputField
                  key={field.key}
                  id={`pack-${index}-${field.key}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step={field.step}
                  label={field.label}
                  value={packs[index][field.key]}
                  onChange={(event) => update(index, field.key, event.target.value)}
                />
              ))}
            </div>
            <div aria-live="polite" className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-5">
              <div>
                <p className="text-xs text-muted-foreground">Total to pay</p>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">{result ? formatPence(result.total) : "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Price per tablet</p>
                <p className="text-xl font-semibold tabular-nums">{result ? formatPence(result.perTablet) : "—"}</p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
