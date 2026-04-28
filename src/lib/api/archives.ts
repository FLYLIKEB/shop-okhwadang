import { apiClient } from './core';

export interface NiloType {
  id: number;
  name: string;
  nameKo: string;
  color: string;
  region: string;
  description: string;
  characteristics: string[];
  productUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ProcessStep {
  id: number;
  step: number;
  title: string;
  description: string;
  detail: string;
}

export interface Artist {
  id: number;
  name: string;
  title: string;
  region: string;
  story: string;
  specialty: string;
  imageUrl: string | null;
  productUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ArchivesResponse {
  niloTypes: NiloType[];
  processSteps: ProcessStep[];
  artists: Artist[];
}

export const archivesApi = {
  getAll: (locale?: string) =>
    apiClient.get<ArchivesResponse>(locale ? `/archives?locale=${locale}` : '/archives'),
};
