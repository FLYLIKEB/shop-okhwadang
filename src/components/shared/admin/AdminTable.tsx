interface Column {
  label: string;
  width?: string;
}

interface AdminTableProps {
  columns: Column[];
  children: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export function AdminTable({ columns, children, emptyMessage = '데이터가 없습니다.', isEmpty }: AdminTableProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr className="text-left text-xs text-muted-foreground uppercase">
            {columns.map((col, i) => (
              <th key={i} className={`py-3 px-4${col.width ? ` ${col.width}` : ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

interface AdminTableRowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function AdminTableRowActions({ onEdit, onDelete }: AdminTableRowActionsProps) {
  return (
    <div className="flex gap-2">
      <button onClick={onEdit} className="text-sm text-foreground hover:underline">
        수정
      </button>
      <button onClick={onDelete} className="text-sm text-destructive hover:underline">
        삭제
      </button>
    </div>
  );
}
