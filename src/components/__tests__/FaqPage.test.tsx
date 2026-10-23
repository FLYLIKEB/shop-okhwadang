import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FaqPage from '@/app/[locale]/faq/page';
import { faqsApi } from '@/lib/api';
import userEvent from '@testing-library/user-event';

function makeTranslator(namespace?: string) {
  const dict: Record<string, string> = {
    title: '자주 묻는 질문',
    loadError: 'FAQ를 불러오지 못했습니다.',
    empty: '해당 카테고리의 FAQ가 없습니다.',
    orderLookupTitle: '주문 후 주문 상태는 어떻게 확인하나요?',
    orderLookupGuestDescription: '비회원 주문은 결제 시 사용한 이메일과 주문번호로 비회원 주문조회 페이지에서 확인할 수 있습니다.',
    orderLookupGuestAction: '비회원 주문조회로 이동',
    orderLookupMemberDescription: '회원 주문은 로그인 후 마이페이지 주문 내역에서 계속 확인할 수 있습니다.',
    orderLookupMemberAction: '로그인 후 주문 내역에서 결제 상태와 배송 상태를 확인해 주세요.',
    'categories.all': '전체',
    'categories.shipping': '배송',
    'categories.payment': '결제',
    'categories.exchange': '교환/반품',
    'categories.member': '회원',
    'categories.other': '기타',
  };
  return (key: string) => dict[key] ?? `${namespace ? `${namespace}.` : ''}${key}`;
}

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'ko' }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => makeTranslator(namespace),
}));

vi.mock('@/lib/api', () => ({
  faqsApi: {
    getList: vi.fn(),
  },
}));

describe('FaqPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(faqsApi.getList).mockResolvedValue({ data: [], total: 0 });
  });

  it('guest-aware order lookup guidance is shown', async () => {
    render(<FaqPage />);

    expect(await screen.findByText('주문 후 주문 상태는 어떻게 확인하나요?')).toBeInTheDocument();
    expect(screen.getByText('비회원 주문은 결제 시 사용한 이메일과 주문번호로 비회원 주문조회 페이지에서 확인할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '비회원 주문조회로 이동' })).toHaveAttribute('href', '/ko/order/lookup');
    expect(screen.getByText(/회원 주문은 로그인 후 마이페이지 주문 내역에서 계속 확인할 수 있습니다./)).toBeInTheDocument();

    await waitFor(() => expect(faqsApi.getList).toHaveBeenCalledWith(undefined, 'ko'));
  });

  it('keeps category filtering and keyboard accordion disclosure on text controls', async () => {
    const user = userEvent.setup();
    vi.mocked(faqsApi.getList).mockResolvedValue({ data: [{
      id: 1, category: '배송', question: '배송은 언제 되나요?', answer: '영업일 기준으로 출고합니다.',
      questionEn: null, questionJa: null, questionZh: null, answerEn: null, answerJa: null, answerZh: null,
      sortOrder: 0, isPublished: true, createdAt: '2026-10-24',
    }], total: 1 });
    render(<FaqPage />);
    const question = await screen.findByRole('button', { name: '배송은 언제 되나요?' });
    question.focus();
    await user.keyboard('{Enter}');
    expect(question).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('영업일 기준으로 출고합니다.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '배송' }));
    await waitFor(() => expect(faqsApi.getList).toHaveBeenLastCalledWith('배송', 'ko'));
    expect(screen.getByRole('button', { name: '배송' })).toHaveAttribute('aria-pressed', 'true');
  });
});
