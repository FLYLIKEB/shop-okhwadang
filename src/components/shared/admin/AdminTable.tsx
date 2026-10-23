import { localMessage } from '@/utils/localMessages';
interface Column {
  label: string;
  width?: string;
}

interface AdminTableProps {
  columns: Column[];
  children: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
  density?: 'regular' | 'compact';
}

export function AdminTable({
  columns,
  children,
  emptyMessage = localMessage('adminEnglish.noDataAvailable'),
  isEmpty,
  density = 'regular',
}: AdminTableProps) {
  return (
    <div className="admin-surface overflow-hidden">
      <table className="w-full">
        <thead className="admin-table-head">
          <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`${density === 'compact' ? 'admin-row-compact' : 'admin-row'} border-b border-border px-4 py-3${col.width ? ` ${col.width}` : ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
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
        {localMessage('popups.edit')}
      </button>
      <button onClick={onDelete} className="text-sm text-destructive hover:underline">
        {localMessage('popups.delete')}
      </button>
    </div>
  );
}
