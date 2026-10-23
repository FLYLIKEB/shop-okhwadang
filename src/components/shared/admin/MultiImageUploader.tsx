'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadApi } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { X, Upload } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { toastMessage } from '@/utils/toastMessages';
import { useTranslations } from 'next-intl';

export interface ImageItem {
  url: string;
  alt?: string;
}

interface MultiImageUploaderProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  maxImages?: number;
  accept?: string;
}

export default function MultiImageUploader({
  images,
  onChange,
  maxImages = 10,
  accept = 'image/jpeg,image/png,image/webp',
}: MultiImageUploaderProps) {
  const t = useTranslations('admin.multiImageUploader');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const latestImages = useRef(images);
  latestImages.current = images;

  const publish = (next: ImageItem[]) => {
    latestImages.current = next;
    onChange(next);
  };
  const handleFile = async (file: File, tempUrl: string) => {
    try {
      const result = await uploadApi.uploadImage(file);
      publish(latestImages.current.map((img) => img.url === tempUrl ? { ...img, url: result.url } : img));
      toast.success(toastMessage('imageUploadSuccess'));
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('imageUploadError')));
      publish(latestImages.current.filter((img) => img.url !== tempUrl));
    }
  };

  const uploadFiles = (files: File[]) => {
    const selected = files.filter((file) => accept.split(',').some((type) =>
      type.trim().endsWith('/*') ? file.type.startsWith(type.trim().slice(0, -1)) : file.type === type.trim(),
    )).slice(0, Math.max(0, maxImages - latestImages.current.length));
    const pending = selected.map((file) => ({ file, url: `uploading-${crypto.randomUUID()}` }));
    publish([...latestImages.current, ...pending.map(({ url }) => ({ url }))]);
    pending.forEach(({ file, url }) => void handleFile(file, url));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    uploadFiles(files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  const removeImage = (index: number) => {
    publish(latestImages.current.filter((_, i) => i !== index));
  };

  const moveImage = (from: number, to: number) => {
    const newImages = [...latestImages.current];
    const [moved] = newImages.splice(from, 1);
    newImages.splice(to, 0, moved);
    publish(newImages);
  };

  return (
    <div className="space-y-3">
      <div
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {images.map((img, index) => (
          <div
            key={`${index}-${img.url}`}
            className={cn(
              'relative aspect-square rounded-lg border overflow-hidden bg-muted group',
              img.url.startsWith('uploading-') && 'opacity-50',
            )}
          >
            {img.url.startsWith('uploading-') ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">{t('uploading')}</span>
              </div>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.alt ?? t('image', { number: index + 1 })}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => index > 0 && moveImage(index, index - 1)}
                    disabled={index === 0}
                    aria-label={t('moveUp')}
                    className="p-1 rounded bg-white/20 text-white text-xs enabled:hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => index < images.length - 1 && moveImage(index, index + 1)}
                    disabled={index === images.length - 1}
                    aria-label={t('moveDown')}
                    className="p-1 rounded bg-white/20 text-white text-xs enabled:hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={t('remove')}
                    className="p-1 rounded bg-white/20 text-white text-xs hover:bg-red-500/50"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {images.length < maxImages && (
          <div
            className={cn(
              'relative aspect-square cursor-pointer rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
            )}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t('add')}</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleChange}
      />

      {images.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {t('hint', { count: images.length, max: maxImages })}
        </p>
      )}
    </div>
  );
}
