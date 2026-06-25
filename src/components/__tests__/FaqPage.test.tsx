import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FaqPage from '@/app/[locale]/faq/page';
import { faqsApi } from '@/lib/api';

function makeTranslator(namespace?: string) {
  const dict: Record<string, string> = {
    title: '자주 묻는 질문',
    loadError: 'FAQ를 불러오지 못했습니다.',
    empty: '해당 카테고리의 FAQ가 없습니다.',
    memberOnlyOrderTitle: '주문조회는 회원 로그인 후 이용할 수 있습니다.',
    memberOnlyOrderDescription: '옥화당은 현재 회원 주문만 지원하며, 비회원 주문조회 폼은 제공하지 않습니다.',
    memberOnlyOrderAction: '로그인 후 마이페이지 주문 내역에서 결제 상태와 배송 상태를 확인해 주세요.',
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

  it('비회원 주문조회 대신 회원 주문 전용 정책 안내를 노출한다', async () => {
    render(<FaqPage />);

    expect(await screen.findByText('주문조회는 회원 로그인 후 이용할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByText('옥화당은 현재 회원 주문만 지원하며, 비회원 주문조회 폼은 제공하지 않습니다.')).toBeInTheDocument();
    expect(screen.getByText(/마이페이지 주문 내역/)).toBeInTheDocument();

    await waitFor(() => expect(faqsApi.getList).toHaveBeenCalledWith(undefined, 'ko'));
  });
});
