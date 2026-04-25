import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReviewForm from '@/components/shared/reviews/ReviewForm';

const { createMock, uploadMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  uploadMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  reviewsApi: {
    create: createMock,
    uploadImage: uploadMock,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

// StarRating 은 별도 테스트가 있으므로 인터랙티브 stub
vi.mock('@/components/shared/reviews/StarRating', () => ({
  default: ({
    rating,
    onChange,
  }: {
    rating: number;
    size: string;
    interactive?: boolean;
    onChange?: (n: number) => void;
  }) => (
    <div data-testid="star-rating">
      <span data-testid="rating-value">{rating}</span>
      <button type="button" onClick={() => onChange?.(5)}>set-5</button>
      <button type="button" onClick={() => onChange?.(3)}>set-3</button>
    </div>
  ),
}));

describe('ReviewForm', () => {
  beforeEach(() => {
    createMock.mockReset();
    uploadMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  it('기본 렌더 — 별점 0 + 등록 버튼 disabled', () => {
    render(
      <ReviewForm productId={1} orderItemId={2} onSuccess={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByText('리뷰 작성')).toBeInTheDocument();
    expect(screen.getByTestId('rating-value')).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: '리뷰 등록' })).toBeDisabled();
  });

  it('취소 버튼 → onCancel 호출', async () => {
    const onCancel = vi.fn();
    render(<ReviewForm productId={1} orderItemId={2} onSuccess={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('별점 0 인 채로 폼 제출 → toast.error + create 미호출', async () => {
    render(<ReviewForm productId={1} orderItemId={2} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    // 버튼은 disabled — fireEvent submit 으로 강제 시도
    const form = screen.getByRole('button', { name: '리뷰 등록' }).closest('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('별점을 선택해 주세요.');
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('별점 + 본문 입력 후 제출 → reviewsApi.create + onSuccess + 성공 토스트', async () => {
    createMock.mockResolvedValue({ id: 100 });
    const onSuccess = vi.fn();
    render(<ReviewForm productId={42} orderItemId={99} onSuccess={onSuccess} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByText('set-5'));
    await userEvent.type(screen.getByPlaceholderText(/리뷰를 작성/), '좋은 제품!');
    await userEvent.click(screen.getByRole('button', { name: '리뷰 등록' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith({
        productId: 42,
        orderItemId: 99,
        rating: 5,
        content: '좋은 제품!',
        imageUrls: undefined,
      });
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('리뷰가 등록되었습니다.');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('본문 비워도 제출 가능 (content=null)', async () => {
    createMock.mockResolvedValue({ id: 100 });
    render(<ReviewForm productId={1} orderItemId={2} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByText('set-3'));
    await userEvent.click(screen.getByRole('button', { name: '리뷰 등록' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 3, content: null }),
      );
    });
  });

  it('create API 실패 → toast.error', async () => {
    createMock.mockRejectedValue(new Error('서버 오류'));
    const onSuccess = vi.fn();
    render(<ReviewForm productId={1} orderItemId={2} onSuccess={onSuccess} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByText('set-5'));
    await userEvent.click(screen.getByRole('button', { name: '리뷰 등록' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('이미지 업로드 → reviewsApi.uploadImage + 카운터 갱신', async () => {
    uploadMock.mockResolvedValue({ url: 'https://cdn/img1.jpg' });
    render(<ReviewForm productId={1} orderItemId={2} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText('0/5')).toBeInTheDocument();
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;

    await userEvent.upload(fileInput, file);
    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalledWith(file);
    });
    expect(toastSuccessMock).toHaveBeenCalledWith('이미지 업로드 완료');
    await waitFor(() => {
      expect(screen.getByText('1/5')).toBeInTheDocument();
    });
  });

  it('제출 시 imageUrls 함께 전송', async () => {
    uploadMock.mockResolvedValue({ url: 'https://cdn/img1.jpg' });
    createMock.mockResolvedValue({ id: 100 });
    render(<ReviewForm productId={1} orderItemId={2} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    await userEvent.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, file);
    await waitFor(() => expect(uploadMock).toHaveBeenCalled());

    await userEvent.click(screen.getByText('set-5'));
    await userEvent.click(screen.getByRole('button', { name: '리뷰 등록' }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrls: ['https://cdn/img1.jpg'],
        }),
      );
    });
  });

  it('이미지 업로드 실패 → toast.error', async () => {
    uploadMock.mockRejectedValue(new Error('업로드 실패'));
    render(<ReviewForm productId={1} orderItemId={2} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    await userEvent.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, file);

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
    expect(screen.getByText('0/5')).toBeInTheDocument();
  });
});
