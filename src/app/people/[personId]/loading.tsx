export default function PersonDetailLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <p className="sr-only">Loading person detail</p>
      <div className="bg-muted h-8 w-40 rounded-lg motion-safe:animate-pulse" />
      <div className="mt-6 flex items-center gap-3">
        <span className="bg-muted size-12 rounded-full motion-safe:animate-pulse" />
        <div className="grid gap-2">
          <span className="bg-muted h-6 w-48 rounded-sm motion-safe:animate-pulse" />
          <span className="bg-muted h-4 w-64 rounded-sm motion-safe:animate-pulse" />
        </div>
      </div>
    </main>
  );
}
