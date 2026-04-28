import { apiClient } from '../core';
import type { NiloType, ProcessStep, Artist } from '../archives';

export interface CreateNiloTypeData {
  name: string;
  nameKo: string;
  color: string;
  region: string;
  description: string;
  characteristics: string[];
  productUrl: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateProcessStepData {
  step: number;
  title: string;
  description: string;
  detail: string;
}

export interface CreateArtistData {
  name: string;
  title: string;
  region: string;
  story: string;
  specialty: string;
  imageUrl?: string;
  productUrl: string;
  sortOrder?: number;
  isActive?: boolean;
}

export const adminArchivesApi = {
  getNiloTypes: () => apiClient.get<NiloType[]>('/admin/archives/nilo-types'),
  createNiloType: (data: CreateNiloTypeData) =>
    apiClient.post<NiloType>('/admin/archives/nilo-types', data),
  updateNiloType: (id: number, data: Partial<CreateNiloTypeData>) =>
    apiClient.patch<NiloType>(`/admin/archives/nilo-types/${id}`, data),
  deleteNiloType: (id: number) =>
    apiClient.delete<void>(`/admin/archives/nilo-types/${id}`),
  reorderNiloTypes: (orders: Array<{ id: number; sortOrder: number }>) =>
    apiClient.patch<void>('/admin/archives/nilo-types/reorder', orders),

  getProcessSteps: () => apiClient.get<ProcessStep[]>('/admin/archives/process-steps'),
  createProcessStep: (data: CreateProcessStepData) =>
    apiClient.post<ProcessStep>('/admin/archives/process-steps', data),
  updateProcessStep: (id: number, data: Partial<CreateProcessStepData>) =>
    apiClient.patch<ProcessStep>(`/admin/archives/process-steps/${id}`, data),
  deleteProcessStep: (id: number) =>
    apiClient.delete<void>(`/admin/archives/process-steps/${id}`),

  getArtists: () => apiClient.get<Artist[]>('/admin/archives/artists'),
  createArtist: (data: CreateArtistData) =>
    apiClient.post<Artist>('/admin/archives/artists', data),
  updateArtist: (id: number, data: Partial<CreateArtistData>) =>
    apiClient.patch<Artist>(`/admin/archives/artists/${id}`, data),
  deleteArtist: (id: number) =>
    apiClient.delete<void>(`/admin/archives/artists/${id}`),
  reorderArtists: (orders: Array<{ id: number; sortOrder: number }>) =>
    apiClient.patch<void>('/admin/archives/artists/reorder', orders),
};
