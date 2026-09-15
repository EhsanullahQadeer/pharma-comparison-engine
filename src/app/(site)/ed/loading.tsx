export default function Loading() {
  return <div role="status" className="mx-auto max-w-6xl animate-pulse px-6 py-16 motion-reduce:animate-none">
    <span className="sr-only">Loading ED page</span>
    <div className="mb-10 h-4 w-48 rounded bg-muted" />
    <div className="h-12 w-3/4 rounded-xl bg-muted" />
    <div className="mt-5 h-6 w-full rounded bg-muted" />
    <div className="mt-10 grid gap-6 lg:grid-cols-3"><div className="h-96 rounded-3xl bg-muted lg:col-span-2" /><div className="h-96 rounded-3xl bg-muted" /></div>
  </div>;
}
