import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FormField, { getFormControlClassName } from '@/components/ui/FormField';
import FormInput from '@/components/ui/FormInput';
import FormSelect from '@/components/ui/FormSelect';

describe('FormField', () => {
  it('connects label, description, error, and invalid state to the control', () => {
    render(
      <FormField id="email" label="Email" required description="Use a reachable address" error="Required">
        {({ controlProps }) => (
          <input {...controlProps} className={getFormControlClassName({ error: 'Required' })} />
        )}
      </FormField>,
    );

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('id', 'email');
    expect(input).toHaveAttribute('aria-labelledby', 'email-label');
    expect(input).toHaveAttribute('aria-describedby', 'email-description email-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Use a reachable address')).toHaveAttribute('id', 'email-description');
    expect(screen.getByText('Required')).toHaveAttribute('id', 'email-error');
  });

  it('preserves native input value and change handling through FormInput', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FormInput id="name" label="Name" value="" onChange={onChange} />);

    await user.type(screen.getByLabelText('Name'), 'ok');

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('preserves select value and required/error aria through FormSelect', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FormSelect
        id="status"
        label="Status"
        required
        error="Choose one"
        value="draft"
        onChange={onChange}
        options={[
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' },
        ]}
      />,
    );

    const select = screen.getByLabelText('Status');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAttribute('aria-describedby', 'status-error');

    await user.selectOptions(select, 'published');

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
