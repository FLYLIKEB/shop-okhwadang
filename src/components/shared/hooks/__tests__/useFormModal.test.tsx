import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFormModal } from '@/components/shared/hooks/useFormModal';

interface FormState {
  title: string;
  published: boolean;
}

describe('useFormModal', () => {
  const defaults: FormState = { title: '', published: false };
  const initial: FormState = { title: '기존 글', published: true };

  it('switches between defaults and initial data when the modal opens', () => {
    const { result, rerender } = renderHook(
      ({ current, open }) => useFormModal(defaults, current, open),
      { initialProps: { current: null as FormState | null, open: false } },
    );

    expect(result.current.formData).toEqual(defaults);

    rerender({ current: initial, open: true });
    expect(result.current.formData).toEqual(initial);

    rerender({ current: null, open: true });
    expect(result.current.formData).toEqual(defaults);
  });

  it('submits current form data, closes on success, and clears loading', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const preventDefault = vi.fn();
    const { result } = renderHook(() => useFormModal(defaults, initial, true));

    act(() => {
      result.current.setFormData({ title: '수정됨', published: false });
    });

    await act(async () => {
      await result.current.handleSubmit(
        { preventDefault } as unknown as React.FormEvent,
        onSubmit,
        onClose,
      );
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledWith({ title: '수정됨', published: false });
    expect(onClose).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('keeps the modal open but still clears loading when submit fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('fail'));
    const onClose = vi.fn();
    const { result } = renderHook(() => useFormModal(defaults, initial, true));

    await expect(act(async () => {
      await result.current.handleSubmit(
        { preventDefault: vi.fn() } as unknown as React.FormEvent,
        onSubmit,
        onClose,
      );
    })).rejects.toThrow('fail');

    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });
});
