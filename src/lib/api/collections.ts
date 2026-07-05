export const CollectionType = {
  CLAY: 'clay',
  SHAPE: 'shape',
} as const;

export type CollectionType = (typeof CollectionType)[keyof typeof CollectionType];

export interface Collection {
  id: number;
  type: CollectionType;
  name: string;
  nameKo: string | null;
  color: string | null;
  description: string | null;
  imageUrl: string | null;
  productUrl: string;
  sortOrder: number;
  isActive: boolean;
}
