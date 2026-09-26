import Image from "next/image";

import { cn } from "@/lib/utils";

const sizes = {
  sm: { box: "size-10 text-sm", px: 40 },
  md: { box: "size-12 text-base", px: 48 },
  lg: { box: "size-16 text-xl sm:size-20 sm:text-2xl", px: 80 },
  xl: { box: "size-24 text-3xl sm:size-28", px: 112 },
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
}

// The pharmacy's own site icon when staff (or the logo script) have saved one, otherwise a
// monogram on the brand gradient ring. Always sits beside the pharmacy's name, so it's decorative.
export function PharmacyAvatar({ name, logoUrl, size = "md", className }: { name: string; logoUrl?: string | null; size?: keyof typeof sizes; className?: string }) {
  const { box, px } = sizes[size];
  return (
    <span aria-hidden="true" className={cn("relative flex shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-chart-1 via-chart-2 to-chart-5 p-0.5", box, className)}>
      <span className="flex size-full items-center justify-center overflow-hidden rounded-[calc(var(--radius-2xl)-2px)] bg-card font-semibold tracking-tight text-card-foreground">
        {logoUrl ? (
          // Logos are tiny, mixed-format files (ico/svg/png) served from /public — no optimisation needed.
          <Image src={logoUrl} alt="" width={px} height={px} unoptimized className="size-[78%] object-contain" />
        ) : initials(name)}
      </span>
    </span>
  );
}
