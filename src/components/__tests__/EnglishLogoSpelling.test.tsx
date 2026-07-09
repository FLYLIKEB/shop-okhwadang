import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LogoSlider from '@/components/LogoSlider';
import Logo from '@/components/shared/Logo';

describe('English site logo', () => {
  it('renders the shared image logo with an explicit English accessible label', () => {
    render(<Logo alt="Ockhwadang" />);

    expect(screen.getByRole('img', { name: 'Ockhwadang' })).toHaveAttribute('src', '/logo-okhwadang.png');
    expect(screen.queryByText('Ockhwadang')).not.toBeInTheDocument();
    expect(screen.queryByText('Okhwadang')).not.toBeInTheDocument();
  });

  it('renders the shared image logo for the decorative hero overlay', () => {
    render(<LogoSlider />);

    expect(screen.getByRole('presentation', { hidden: true })).toHaveAttribute('src', '/logo-okhwadang.png');
    expect(screen.queryByText('Ockhwadang')).not.toBeInTheDocument();
    expect(screen.queryByText('Okhwadang')).not.toBeInTheDocument();
  });

  it('keeps the Korean image logo default unchanged', () => {
    render(<Logo />);

    expect(screen.getByRole('img', { name: '옥화당' })).toHaveAttribute('src', '/logo-okhwadang.png');
  });
});
