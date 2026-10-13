import { Skeleton } from "@/components/common/skeleton";

// Placeholders mirror each public page's final layout (hero + aside, then its own body) so data
// arriving doesn't shift the page.
function HeroSkeleton() {
  return (
    <>
      <Skeleton className="mb-10 h-4 w-48" />
      <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
        <div>
          <Skeleton className="mb-4 h-4 w-40" />
          <Skeleton className="h-12 w-full max-w-2xl rounded-xl" />
          <Skeleton className="mt-5 h-6 w-full max-w-3xl" />
          <Skeleton className="mt-2 h-6 w-2/3 max-w-xl" />
        </div>
        <SummarySkeleton />
      </div>
    </>
  );
}

// The summary card beside a page heading.
export function SummarySkeleton() {
  return <Skeleton className="h-40 w-full rounded-3xl lg:w-72" />;
}

export function ComparisonFiltersSkeleton() {
  return <Skeleton className="mt-10 h-44 w-full rounded-3xl" />;
}

function PageFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <span className="sr-only">{label}</span>
      <HeroSkeleton />
      {children}
    </div>
  );
}

function OfferRowsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="mt-10 space-y-6">
      <Skeleton className="h-7 w-64" />
      {Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-44 w-full rounded-3xl" />)}
    </div>
  );
}

function TableSkeleton({ rows, heading = false }: { rows: number; heading?: boolean }) {
  return (
    <div className="mt-10">
      {heading ? <Skeleton className="mb-7 h-7 w-64" /> : null}
      <div className="overflow-hidden rounded-xl border border-border">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="mt-px h-20 w-full rounded-none" />)}
      </div>
    </div>
  );
}

function CardGridSkeleton({ cards, height }: { cards: number; height: string }) {
  return (
    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }, (_, index) => <Skeleton key={index} className={`${height} w-full rounded-3xl`} />)}
    </div>
  );
}

// The part of the comparison page that changes with the filters: stat tiles, then the price table.
export function ComparisonResultsSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading prices</span>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}
      </div>
      <TableSkeleton rows={5} heading />
    </div>
  );
}

export function ComparisonPageSkeleton() {
  return (
    <PageFrame label="Loading prices">
      <ComparisonFiltersSkeleton />
      <ComparisonResultsSkeleton />
    </PageFrame>
  );
}

export function IngredientPageSkeleton() {
  return (
    <PageFrame label="Loading prices">
      <CardGridSkeleton cards={3} height="h-80" />
      <OfferRowsSkeleton rows={3} />
    </PageFrame>
  );
}

export function DirectoryPageSkeleton() {
  return (
    <PageFrame label="Loading pharmacies">
      <TableSkeleton rows={6} />
    </PageFrame>
  );
}

export function ProfilePageSkeleton() {
  return (
    <PageFrame label="Loading pharmacy">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2"><OfferRowsSkeleton rows={3} /></div>
        <div className="space-y-5 lg:pt-10">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      </div>
    </PageFrame>
  );
}
