import { Badge } from "@/components/common/badge";
import { GradientText } from "@/components/ed/gradient-text";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

// Eyebrow badge + h2 (with a gradient accent) + optional intro, shared by every homepage section.
export function SectionHeading({ eyebrow, title, accent, description, align = "center", id }: {
  eyebrow: string;
  title: string;
  accent: string;
  description?: ReactNode;
  align?: "center" | "left";
  id?: string;
}) {
  return (
    <Reveal className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <Badge variant="secondary" className="rounded-full px-3 py-1">{eyebrow}</Badge>
      <h2 id={id} className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title} <GradientText>{accent}</GradientText>
      </h2>
      {description ? <p className="mt-4 text-pretty text-muted-foreground">{description}</p> : null}
    </Reveal>
  );
}
