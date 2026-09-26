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
        <Skeleton className="h-40 w-full rounded-3xl lg:w-72" />
      </div>
    </>
  );
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

function CardGridSkeleton({ cards, height }: { cards: number; height: string }) {
  return (
    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }, (_, index) => <Skeleton key={index} className={`${height} w-full rounded-3xl`} />)}
    </div>
  );
}

export function ComparisonPageSkeleton() {
  return (
    <PageFrame label="Loading prices">
      <Skeleton className="mt-10 h-56 w-full rounded-3xl" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}
      </div>
      <OfferRowsSkeleton rows={4} />
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
      <CardGridSkeleton cards={6} height="h-64" />
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
