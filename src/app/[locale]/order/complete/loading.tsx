export default function OrderCompleteLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 space-y-4">
      <div className="h-16 w-16 animate-pulse rounded-full bg-muted mx-auto" />
      <div className="h-8 animate-pulse rounded bg-muted" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted mx-auto" />
      <div className="mt-8 rounded-lg border p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}
