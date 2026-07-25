export function SkeletonCard() {
  return (
    <div className="skeleton-card mb-5 flex flex-col gap-3 p-5" aria-hidden="true">
      <span className="skeleton-line skeleton-chip" />
      <span className="skeleton-line skeleton-title" />
      <span className="skeleton-line" />
      <span className="skeleton-line skeleton-short" />
    </div>
  );
}
