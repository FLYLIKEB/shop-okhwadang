import { X } from 'lucide-react';
import type { DraftBlock } from '@/components/shared/admin/page-editor/SortableBlockItem';
import PreviewBlock, { BLOCK_TYPE_LABELS } from '@/components/shared/admin/page-editor/PreviewBlock';

// --- Preview modal ---

interface PreviewModalProps {
  blocks: DraftBlock[];
  onClose: () => void;
}

export default function PreviewModal({ blocks, onClose }: PreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative h-4/5 w-4/5 overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="mb-6 text-xl font-bold">미리보기</h2>
        {blocks.filter((b) => b.is_visible).length === 0 ? (
          <p className="text-sm text-muted-foreground">표시할 블록이 없습니다.</p>
        ) : (
          <div className="space-y-6">
            {blocks
              .filter((b) => b.is_visible)
              .map((block) => (
                <div key={block.id} className="rounded-lg border p-4">
                  <span className="mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {BLOCK_TYPE_LABELS[block.type] ?? block.type}
                  </span>
                  <PreviewBlock block={block} />
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
