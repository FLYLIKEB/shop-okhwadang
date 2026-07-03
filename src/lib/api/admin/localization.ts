import { apiClient } from '../core';

export type LocalizationResourceKind =
  | 'product'
  | 'category'
  | 'productOption'
  | 'page'
  | 'pageBlock'
  | 'navigation'
  | 'externalReview';

export interface LocalizationCoverageSummary {
  kind: LocalizationResourceKind;
  total: number;
  missing: number;
  complete: number;
}

export interface LocalizationMissingItem {
  kind: LocalizationResourceKind;
  id: number;
  label: string;
  missingFields: string[];
  editHref: string | null;
  fallbackPolicy: 'koFallback' | 'sourceTextFallback';
}

export interface LocalizationCoverageReport {
  locale: 'en';
  fallbackPolicy: {
    default: 'koFallback';
    smartStoreReviews: 'sourceTextFallback';
  };
  summaries: LocalizationCoverageSummary[];
  items: LocalizationMissingItem[];
}

export const adminLocalizationApi = {
  getCoverage: () => apiClient.get<LocalizationCoverageReport>('/admin/localization/coverage'),
};
