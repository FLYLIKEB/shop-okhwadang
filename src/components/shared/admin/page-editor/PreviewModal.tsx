import type { DraftBlock } from '@/components/shared/admin/page-editor/SortableBlockItem';
import PreviewBlock, { BLOCK_TYPE_LABELS } from '@/components/shared/admin/page-editor/PreviewBlock';
import Modal from '@/components/ui/Modal';

// --- Preview modal ---

interface PreviewModalProps {
  blocks: DraftBlock[];
  onClose: () => void;
}

export default function PreviewModal({ blocks, onClose }: PreviewModalProps) {
  return (
    <Modal isOpen onClose={onClose} maxWidth="xl" className="max-h-screen overflow-y-auto p-7">
        <h2 className="mb-6 typo-h2 font-body">미리보기</h2>
        {blocks.filter((b) => b.is_visible).length === 0 ? (
          <p className="text-sm text-muted-foreground">표시할 블록이 없습니다.</p>
        ) : (
          <div className="space-y-6">
            {blocks
              .filter((b) => b.is_visible)
              .map((block) => (
                  <div key={block.id} className="surface-card p-4">
                  <span className="mb-3 block typo-label font-semibold uppercase tracking-wide text-muted-foreground">
                    {BLOCK_TYPE_LABELS[block.type] ?? block.type}
                  </span>
                  <PreviewBlock block={block} />
                </div>
              ))}
          </div>
        )}
    </Modal>
  );
}
