'use client';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableBlockItem from './SortableBlockItem';
import type { DraftBlock } from './SortableBlockItem';

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
  const sensors = useSensors(
    useSensor(PointerSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(Number(active.id), Number(over.id));
  };

  if (blocks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground p-8">
        <p className="text-sm font-medium text-foreground">블록이 없습니다</p>
        <p className="text-xs max-w-xs">← 왼쪽 팔레트에서 블록 종류를 클릭하면<br/>이 캔버스에 추가됩니다</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
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
