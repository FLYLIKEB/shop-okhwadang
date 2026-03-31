interface SkeletonListProps {
  count?: number;
  height?: string;
  className?: string;
}

export default function SkeletonList({
  count = 3,
  height = 'h-24',
  className,
}: SkeletonListProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded bg-muted ${height}`}
        />
      ))}
    </div>
  );
}
