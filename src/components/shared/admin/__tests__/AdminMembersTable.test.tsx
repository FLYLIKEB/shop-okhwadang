import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminMembersTable } from '../AdminMembersTable';
import type { AdminMember } from '@/lib/api';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'ko',
}));

vi.mock('@/lib/api', () => ({
  adminMembersApi: { updateRole: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const member: AdminMember = {
  id: 1,
  email: 'tea@example.com',
  name: '옥화당',
  phone: null,
  role: 'user',
  tier: 'Gold',
  tierAccumulatedAmount: 500000,
  tierEvaluatedAt: '2026-01-01T00:00:00.000Z',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('AdminMembersTable', () => {
  it('shows current tier and accumulated amount from member fields', () => {
    render(<AdminMembersTable members={[member]} onRoleChange={vi.fn()} />);

    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByText('₩500,000')).toBeInTheDocument();
  });

  it('renders dashes when rolling backend responses omit tier fields', () => {
    const legacyMember: AdminMember = {
      ...member,
      tier: undefined,
      tierAccumulatedAmount: undefined,
    };

    render(<AdminMembersTable members={[legacyMember]} onRoleChange={vi.fn()} />);

    expect(screen.getAllByText('-')).toHaveLength(2);
    expect(screen.queryByText('₩NaN')).not.toBeInTheDocument();
  });
});
