import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LogoSlider from '@/components/LogoSlider';
import Logo from '@/components/shared/Logo';

let mockLocale = 'ko';

vi.mock('next-intl', () => ({
  useLocale: () => mockLocale,
}));

afterEach(() => {
  mockLocale = 'ko';
});

describe('English logo spelling', () => {
  it('renders the English header wordmark as Ockhwadang', () => {
    mockLocale = 'en';

    render(<Logo />);

    expect(screen.getByText('Ockhwadang')).toBeInTheDocument();
    expect(screen.getByLabelText('Ockhwadang')).toBeInTheDocument();
    expect(screen.queryByText('Okhwadang')).not.toBeInTheDocument();
  });

  it('renders the English hero overlay wordmark as Ockhwadang', () => {
    mockLocale = 'en';

    render(<LogoSlider />);

    expect(screen.getByText('Ockhwadang')).toBeInTheDocument();
    expect(screen.queryByText('Okhwadang')).not.toBeInTheDocument();
  });

  it('keeps the Korean image logo unchanged', () => {
    render(<Logo />);

    expect(screen.getByRole('img', { name: '옥화당' })).toHaveAttribute('src', '/logo-okhwadang.png');
  });
});
