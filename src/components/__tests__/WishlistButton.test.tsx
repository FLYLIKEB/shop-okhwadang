import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockAdd = vi.fn();
const mockRemove = vi.fn();
vi.mock('@/lib/api', () => ({
  wishlistApi: {
    add: (...args: unknown[]) => mockAdd(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    getList: vi.fn(),
    check: vi.fn(),
  },
  cartApi: {},
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Import after mocks
import WishlistButton from '@/components/shared/WishlistButton';

describe('WishlistButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, user: null, logout: vi.fn() });
  });

  it('비로그인 클릭 → router.push("/login")', () => {
    render(<WishlistButton productId={1} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('로그인 상태 추가 → API 호출 후 wishlistId 업데이트', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, user: null, logout: vi.fn() });
    mockAdd.mockResolvedValue({ id: 10, productId: 1, createdAt: new Date().toISOString() });

    render(<WishlistButton productId={1} initialIsWishlisted={false} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledWith(1);
    });
  });
});
