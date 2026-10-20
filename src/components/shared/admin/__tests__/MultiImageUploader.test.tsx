import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MultiImageUploader, { type ImageItem } from '../MultiImageUploader';

const uploadImage = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ uploadApi: { uploadImage } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

function deferred() {
  let resolve!: (result: { url: string }) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<{ url: string }>((fulfilled, rejected) => { resolve = fulfilled; reject = rejected; });
  return { promise, resolve, reject };
}

function Harness({ initial = [], maxImages = 10 }: { initial?: ImageItem[]; maxImages?: number }) {
  const [images, setImages] = useState(initial);
  return <><MultiImageUploader images={images} onChange={setImages} maxImages={maxImages} /><output>{JSON.stringify(images)}</output></>;
}

function images() {
  return JSON.parse(screen.getByRole('status').textContent ?? '[]') as ImageItem[];
}

describe('MultiImageUploader concurrent uploads', () => {
  beforeEach(() => uploadImage.mockReset());

  it('retains selection order on reverse completion and isolates failure', async () => {
    const first = deferred();
    const second = deferred();
    const third = deferred();
    uploadImage.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockReturnValueOnce(third.promise);
    const { container } = render(<Harness />);
    fireEvent.change(container.querySelector('input')!, { target: { files: ['first', 'second', 'third'].map((name) => new File(['image'], `${name}.png`, { type: 'image/png' })) } });
    expect(images()).toHaveLength(3);
    await act(async () => third.resolve({ url: 'third.png' }));
    await act(async () => second.reject(new Error('failed')));
    await act(async () => first.resolve({ url: 'first.png' }));
    expect(images()).toEqual([{ url: 'first.png' }, { url: 'third.png' }]);
  });

  it('keeps local removal and reordering while a file uploads', async () => {
    const pending = deferred();
    uploadImage.mockReturnValue(pending.promise);
    const { container } = render(<Harness initial={[{ url: 'one.png', alt: 'one' }, { url: 'two.png' }]} />);
    fireEvent.change(container.querySelector('input')!, { target: { files: [new File(['image'], 'new.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getAllByLabelText('moveUp')[1]);
    fireEvent.click(screen.getAllByLabelText('remove')[1]);
    await act(async () => pending.resolve({ url: 'new.png' }));
    expect(images()).toEqual([{ url: 'two.png' }, { url: 'new.png' }]);
  });

  it('counts pending slots toward the maximum and accepts only configured image types', async () => {
    const pending = deferred();
    uploadImage.mockReturnValue(pending.promise);
    const { container } = render(<Harness maxImages={2} />);
    const input = container.querySelector('input')!;
    fireEvent.change(input, { target: { files: [new File(['svg'], 'bad.svg', { type: 'image/svg+xml' }), new File(['image'], 'one.png', { type: 'image/png' })] } });
    fireEvent.change(input, { target: { files: [new File(['image'], 'two.png', { type: 'image/png' }), new File(['image'], 'three.png', { type: 'image/png' })] } });
    expect(uploadImage).toHaveBeenCalledTimes(2);
    expect(images()).toHaveLength(2);
    await act(async () => pending.resolve({ url: 'ok.png' }));
    expect(images()).toHaveLength(2);
  });
});
