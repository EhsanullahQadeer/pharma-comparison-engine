import { cn } from "@/lib/utils";

const sizes = { md: "size-12 text-base", lg: "size-16 text-xl sm:size-20 sm:text-2xl" };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

// Pharmacies have no logos in the catalogue — a monogram on the brand gradient ring stands in.
export function PharmacyAvatar({ name, size = "md" }: { name: string; size?: keyof typeof sizes }) {
  return (
    <span aria-hidden="true" className={cn("relative flex shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-chart-1 via-chart-2 to-chart-5 p-0.5", sizes[size])}>
      <span className="flex size-full items-center justify-center rounded-[calc(var(--radius-2xl)-2px)] bg-card font-semibold tracking-tight">{initials(name)}</span>
    </span>
  );
}
