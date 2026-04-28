import { arrayMove } from '@dnd-kit/sortable';
import type { PageBlock } from '@/lib/api';
import type { DraftBlock } from '@/components/shared/admin/page-editor/SortableBlockItem';

// --- Draft state management ---

export interface DraftState {
  title: string;
  slug: string;
  blocks: DraftBlock[];
  deletedBlockIds: number[];
  hasChanges: boolean;
}

export type DraftAction =
  | { type: 'INIT'; blocks: PageBlock[]; title: string; slug: string }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_SLUG'; slug: string }
  | { type: 'ADD_BLOCK'; blockType: PageBlock['type']; content: Record<string, unknown> }
  | { type: 'DELETE_BLOCK'; blockId: number }
  | { type: 'UPDATE_CONTENT'; blockId: number; content: Record<string, unknown> }
  | { type: 'TOGGLE_VISIBILITY'; blockId: number }
  | { type: 'REORDER'; activeId: number; overId: number };

let nextTempId = -1;

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'INIT':
      nextTempId = -1;
      return {
        title: action.title,
        slug: action.slug,
        blocks: action.blocks.map((b) => ({ ...b })),
        deletedBlockIds: [],
        hasChanges: false,
      };

    case 'SET_TITLE':
      return { ...state, title: action.title, hasChanges: true };

    case 'SET_SLUG':
      return { ...state, slug: action.slug, hasChanges: true };

    case 'ADD_BLOCK': {
      const id = nextTempId--;
      const newBlock: DraftBlock = {
        id,
        type: action.blockType,
        content: action.content,
        sort_order: state.blocks.length,
        is_visible: true,
        _isNew: true,
      };
      return { ...state, blocks: [...state.blocks, newBlock], hasChanges: true };
    }

    case 'DELETE_BLOCK': {
      const block = state.blocks.find((b) => b.id === action.blockId);
      const deletedBlockIds = block && !block._isNew
        ? [...state.deletedBlockIds, action.blockId]
        : state.deletedBlockIds;
      return {
        ...state,
        blocks: state.blocks.filter((b) => b.id !== action.blockId),
        deletedBlockIds,
        hasChanges: true,
      };
    }

    case 'UPDATE_CONTENT':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.blockId
            ? { ...b, content: action.content, _isModified: !b._isNew ? true : b._isModified }
            : b,
        ),
        hasChanges: true,
      };

    case 'TOGGLE_VISIBILITY':
      return {
        ...state,
        blocks: state.blocks.map((b) =>
          b.id === action.blockId
            ? { ...b, is_visible: !b.is_visible, _isModified: !b._isNew ? true : b._isModified }
            : b,
        ),
        hasChanges: true,
      };

    case 'REORDER': {
      const oldIndex = state.blocks.findIndex((b) => b.id === action.activeId);
      const newIndex = state.blocks.findIndex((b) => b.id === action.overId);
      if (oldIndex === -1 || newIndex === -1) return state;
      const reordered = arrayMove(state.blocks, oldIndex, newIndex).map((b, i) => ({
        ...b,
        sort_order: i,
      }));
      return { ...state, blocks: reordered, hasChanges: true };
    }
  }
}
