export function SiteFooter() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <span className="inline-block size-3 rounded-full border-2 border-primary" />
          PharmaCompare
        </span>
        <p>&copy; {new Date().getFullYear()} PharmaCompare. All rights reserved.</p>
      </div>
    </footer>
  );
}
