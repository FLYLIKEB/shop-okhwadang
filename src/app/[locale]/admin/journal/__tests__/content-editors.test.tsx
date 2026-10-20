import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JournalPage from '../page';
import FaqPage from '../../faqs/page';

const { getJournals, updateJournal, getFaqs } = vi.hoisted(() => ({
  getJournals: vi.fn(), updateJournal: vi.fn(), getFaqs: vi.fn(),
}));

vi.mock('@/components/shared/hooks/useAdminGuard', () => ({ useAdminGuard: () => ({ isAdmin: true, isLoading: false }) }));
vi.mock('@/components/shared/hooks/useAdminListPage', () => ({ useAdminListPage: () => ({ filters: { category: '전체' }, setFilter: vi.fn() }) }));
vi.mock('@/lib/api', () => ({
  JournalCategory: { CULTURE: 'culture', USAGE: 'usage', TABLE_SETTING: 'table_setting', NEWS: 'news' },
  adminJournalsApi: { getAll: getJournals, update: updateJournal },
  adminFaqsApi: { getAll: getFaqs },
}));
vi.mock('@/components/ui/Modal', () => ({ default: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => isOpen ? <div>{children}</div> : null }));
vi.mock('@/components/shared/admin/ProductImageUploader', () => ({
  default: ({ onChange, onDerivativesChange }: { onChange: (url: string) => void; onDerivativesChange: (derivatives: Record<string, string>) => void }) => (
    <button type="button" onClick={() => { onChange('https://example.test/new.jpg'); onDerivativesChange({ thumbnail: 'https://example.test/thumb.jpg' }); }}>Upload fixture</button>
  ),
}));

describe('admin content editor regressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getJournals.mockResolvedValue([
      { id: 1, slug: 'first', title: 'First', category: 'culture', date: '2026-10-20', content: '["First paragraph"]', isPublished: false },
      { id: 2, slug: 'empty', title: 'Empty', category: 'culture', date: '2026-10-20', content: '', isPublished: false },
    ]);
    updateJournal.mockResolvedValue({});
    getFaqs.mockResolvedValue([{ id: 1, category: '배송', question: 'Question', answer: 'Answer', sortOrder: 0, isPublished: true }]);
  });

  it('keeps an edited FAQ field through rerenders', async () => {
    render(<FaqPage />);
    fireEvent.click(await screen.findByRole('button', { name: '수정' }));
    const question = screen.getByPlaceholderText('자주 묻는 질문을 입력하세요');
    fireEvent.change(question, { target: { value: 'Changed question' } });
    expect(question).toHaveValue('Changed question');
  });

  it('keeps uploaded URL and derivatives from callbacks in the same event', async () => {
    render(<JournalPage />);
    fireEvent.click((await screen.findAllByRole('button', { name: '수정' }))[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Upload fixture' }));
    fireEvent.submit(screen.getByPlaceholderText('중국 차 도자기 문화').closest('form')!);
    await waitFor(() => expect(updateJournal).toHaveBeenCalledWith(1, expect.objectContaining({
      coverImageUrl: 'https://example.test/new.jpg', coverImageDerivatives: { thumbnail: 'https://example.test/thumb.jpg' },
    })));
  });

  it('clears paragraphs when moving from populated content to an empty journal', async () => {
    render(<JournalPage />);
    fireEvent.click((await screen.findAllByRole('button', { name: '수정' }))[0]);
    expect(screen.getByPlaceholderText('단락 1...')).toHaveValue('First paragraph');
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(screen.getAllByRole('button', { name: '수정' })[1]);
    expect(screen.getByPlaceholderText('단락 1...')).toHaveValue('');
  });
});
