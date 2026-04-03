interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function AdminPagination({
  currentPage,
  totalPages,
  onPageChange,
}: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex justify-center gap-2">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`rounded px-3 py-1 text-sm ${
            currentPage === p ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
