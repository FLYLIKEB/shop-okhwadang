import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadImage, uploadReviewImage } from '@/utils/upload';

const { uploadImageMock, uploadReviewImageMock } = vi.hoisted(() => ({
  uploadImageMock: vi.fn(),
  uploadReviewImageMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  uploadApi: {
    uploadImage: uploadImageMock,
  },
  reviewsApi: {
    uploadImage: uploadReviewImageMock,
  },
}));

describe('upload utils', () => {
  beforeEach(() => {
    uploadImageMock.mockReset();
    uploadReviewImageMock.mockReset();
  });

  it('delegates product/admin image uploads to uploadApi', async () => {
    uploadImageMock.mockResolvedValue({ url: '/uploads/product.jpg' });
    const file = new File(['image'], 'product.jpg', { type: 'image/jpeg' });

    await expect(uploadImage(file, 'products')).resolves.toEqual({ url: '/uploads/product.jpg' });
    expect(uploadImageMock).toHaveBeenCalledWith(file, 'products');
  });

  it('delegates review image uploads to reviewsApi', async () => {
    uploadReviewImageMock.mockResolvedValue({ url: '/uploads/review.jpg' });
    const file = new File(['image'], 'review.jpg', { type: 'image/jpeg' });

    await expect(uploadReviewImage(file)).resolves.toEqual({ url: '/uploads/review.jpg' });
    expect(uploadReviewImageMock).toHaveBeenCalledWith(file);
  });
});
