import { localMessage } from '@/utils/localMessages';
import type { DraftBlock } from '@/components/shared/admin/page-editor/SortableBlockItem';
import PreviewBlock, {
  BLOCK_TYPE_LABELS,
} from '@/components/shared/admin/page-editor/PreviewBlock';
import Modal from '@/components/ui/Modal';

// --- Preview modal ---

interface PreviewModalProps {
  blocks: DraftBlock[];
  onClose: () => void;
}

export default function PreviewModal({ blocks, onClose }: PreviewModalProps) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="xl"
      className="max-h-screen overflow-y-auto p-7"
      ariaLabelledBy="preview-modal-title"
      overlayClassName="p-4"
    >
      <h2 id="preview-modal-title" className="mb-6 typo-h2 font-body">
        {localMessage('admin.reviews.import.previewButton')}
      </h2>
      {blocks.filter((b) => b.is_visible).length === 0 ? (
        <p className="text-sm text-muted-foreground">{localMessage('adminEnglish.noBlocksToDisplay')}</p>
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
