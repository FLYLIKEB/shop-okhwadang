import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BusinessInfoEditor from '../BusinessInfoEditor';
import type { SiteSetting } from '@/lib/api';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  adminSettingsApi: {
    bulkUpdate: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/utils/error', () => ({
  handleApiError: (_err: unknown, fallback: string) => fallback,
}));

vi.mock('@/utils/toastMessages', () => ({
  toastMessage: (key: string) => `toast:${key}`,
}));

vi.mock('@/components/shared/hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: vi.fn(),
}));

const mockSettings: SiteSetting[] = [
  { id: 1, key: 'business_company_name', value: '서로 인터내셔널', valueEn: 'Seoro International', group: 'business_info', label: '상호명', inputType: 'text', options: null, defaultValue: '서로 인터내셔널', sortOrder: 200 },
  { id: 2, key: 'business_ceo', value: '권준현', valueEn: 'Kwon Junhyun', group: 'business_info', label: '대표자명', inputType: 'text', options: null, defaultValue: '권준현', sortOrder: 201 },
  { id: 3, key: 'business_registration_number', value: '131-72-05631', valueEn: '131-72-05631', group: 'business_info', label: '사업자등록번호', inputType: 'text', options: null, defaultValue: '131-72-05631', sortOrder: 202 },
  { id: 4, key: 'business_mail_order_number', value: '2026-서울강남-01632', valueEn: '2026-서울강남-01632', group: 'business_info', label: '통신판매업신고번호', inputType: 'text', options: null, defaultValue: '2026-서울강남-01632', sortOrder: 203 },
  { id: 5, key: 'business_address', value: '서울특별시 강남구 역삼로 114 (현죽빌딩) 8층 8028호 (우 06252)', valueEn: '8028, 8F, 114 Yeoksam-ro', group: 'business_info', label: '주소', inputType: 'text', options: null, defaultValue: '서울특별시 강남구 역삼로 114', sortOrder: 204 },
  { id: 6, key: 'business_phone', value: '010-2908-0393', valueEn: '010-2908-0393', group: 'business_info', label: '대표전화', inputType: 'text', options: null, defaultValue: '010-2908-0393', sortOrder: 205 },
  { id: 7, key: 'business_email', value: 'seorointernational@naver.com', valueEn: 'seorointernational@naver.com', group: 'business_info', label: '이메일', inputType: 'text', options: null, defaultValue: 'seorointernational@naver.com', sortOrder: 206 },
  { id: 8, key: 'business_hours', value: '평일 10:00 - 18:00', valueEn: 'Weekdays 10:00 - 18:00', group: 'business_info', label: '운영시간', inputType: 'text', options: null, defaultValue: '평일 10:00 - 18:00', sortOrder: 207 },
  { id: 9, key: 'business_lunch_time', value: '점심시간 12:00 - 13:00', valueEn: 'Lunch break 12:00 - 13:00', group: 'business_info', label: '점심시간', inputType: 'text', options: null, defaultValue: '점심시간 12:00 - 13:00', sortOrder: 208 },
  { id: 10, key: 'business_holidays', value: '주말·공휴일 휴무', valueEn: 'Closed on weekends & holidays', group: 'business_info', label: '휴무일', inputType: 'text', options: null, defaultValue: '주말·공휴일 휴무', sortOrder: 209 },
  { id: 11, key: 'business_privacy_officer', value: '권준현', valueEn: 'Kwon Junhyun', group: 'business_info', label: '개인정보보호책임자', inputType: 'text', options: null, defaultValue: '권준현', sortOrder: 210 },
  { id: 12, key: 'business_info_url', value: 'https://www.ftc.go.kr/bizCommPop.do?wrkr_no=1317205631', valueEn: 'https://www.ftc.go.kr/bizCommPop.do?wrkr_no=1317205631', group: 'business_info', label: '사업자정보확인 URL', inputType: 'text', options: null, defaultValue: 'https://www.ftc.go.kr/bizCommPop.do?wrkr_no=1317205631', sortOrder: 211 },
];

describe('BusinessInfoEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all business info fields', () => {
    render(<BusinessInfoEditor initialSettings={mockSettings} />);
    expect(screen.getByText('상호명')).toBeInTheDocument();
    expect(screen.getByText('대표자명')).toBeInTheDocument();
    expect(screen.getByText('사업자등록번호')).toBeInTheDocument();
    expect(screen.getByText('통신판매업신고번호')).toBeInTheDocument();
    expect(screen.getByText('주소')).toBeInTheDocument();
    expect(screen.getByText('대표전화')).toBeInTheDocument();
    expect(screen.getByText('이메일')).toBeInTheDocument();
    expect(screen.getByText('운영시간')).toBeInTheDocument();
    expect(screen.getByText('점심시간')).toBeInTheDocument();
    expect(screen.getByText('휴무일')).toBeInTheDocument();
    expect(screen.getByText('개인정보보호책임자')).toBeInTheDocument();
    expect(screen.getByText('사업자정보확인 URL')).toBeInTheDocument();
  });

  it('displays current Korean and English values', () => {
    render(<BusinessInfoEditor initialSettings={mockSettings} />);
    expect(screen.getByDisplayValue('서로 인터내셔널')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Seoro International')).toBeInTheDocument();
  });

  it('save button is disabled when no changes', () => {
    render(<BusinessInfoEditor initialSettings={mockSettings} />);
    const saveBtn = screen.getByRole('button', { name: '저장' });
    expect(saveBtn).toBeDisabled();
  });

  it('save button enables when field is edited', () => {
    render(<BusinessInfoEditor initialSettings={mockSettings} />);
    const input = screen.getByDisplayValue('서로 인터내셔널');
    fireEvent.change(input, { target: { value: '새 상호명' } });
    const saveBtn = screen.getByRole('button', { name: '저장' });
    expect(saveBtn).not.toBeDisabled();
  });

  it('calls bulkUpdate with changed keys only on save', async () => {
    const { adminSettingsApi } = await import('@/lib/api');
    render(<BusinessInfoEditor initialSettings={mockSettings} />);
    const input = screen.getByDisplayValue('서로 인터내셔널');
    fireEvent.change(input, { target: { value: '새 상호명' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => {
      expect(adminSettingsApi.bulkUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ key: 'business_company_name', value: '새 상호명' }),
        ]),
      );
    });
  });

  it('shows empty state when no settings provided', () => {
    render(<BusinessInfoEditor initialSettings={[]} />);
    expect(screen.getByText(/DB 마이그레이션을 실행해 주세요/)).toBeInTheDocument();
  });

  it('renders heading and description', () => {
    render(<BusinessInfoEditor initialSettings={mockSettings} />);
    expect(screen.getByText('사업자 정보 설정')).toBeInTheDocument();
    expect(screen.getByText(/전자상거래법 제10조/)).toBeInTheDocument();
  });
});
