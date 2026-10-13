import Link from "@/components/Link";
import { cn } from "@/lib/utils";

// The small line under a partner pharmacy's link: it's one we may earn from (independence page
// commitment). Links to every other pharmacy earn nothing and carry no note.
export function LinkNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Partner · <Link href="/ed/independence#partners" className="underline underline-offset-4 hover:text-foreground">we may earn commission</Link>
    </p>
  );
}
