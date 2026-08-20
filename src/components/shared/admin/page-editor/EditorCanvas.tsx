'use client';

import { useAdminDndSensors } from '@/components/shared/hooks/useDndSensors';
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableBlockItem from './SortableBlockItem';
import type { DraftBlock } from './SortableBlockItem';
import { AdminEmptyState } from '../AdminStates';

interface EditorCanvasProps {
  blocks: DraftBlock[];
  selectedBlockId: number | null;
  onSelectBlock: (id: number) => void;
  onDeleteBlock: (id: number) => void;
  onToggleVisibility: (id: number) => void;
  onReorder: (activeId: number, overId: number) => void;
}

export default function EditorCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onToggleVisibility,
  onReorder,
}: EditorCanvasProps) {
  const sensors = useAdminDndSensors();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(Number(active.id), Number(over.id));
  };

  if (blocks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <AdminEmptyState
          title="블록이 없습니다"
          description="왼쪽 팔레트에서 블록 종류를 클릭하면 이 캔버스에 추가됩니다."
          className="max-w-sm border-0 bg-transparent shadow-none"
        />
      </div>
    );
  }

  return (
    <div className="cms-editor__canvas flex-1 overflow-y-auto p-5">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map((block, index) => (
            <SortableBlockItem
              key={block.id}
              block={block}
              index={index + 1}
              isSelected={selectedBlockId === block.id}
              onSelect={() => onSelectBlock(block.id)}
              onDelete={() => onDeleteBlock(block.id)}
              onToggleVisibility={() => onToggleVisibility(block.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
