import { uploadApi, reviewsApi } from '@/lib/api';

export type { UploadedFile } from '@/lib/api';

export const uploadImage = uploadApi.uploadImage;

export const uploadReviewImage = reviewsApi.uploadImage;
