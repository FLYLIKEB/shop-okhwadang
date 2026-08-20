'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadApi, type CmsMediaKind } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { toastMessage } from '@/utils/toastMessages';
import { localMessage } from '@/utils/localMessages';

interface ProductImageUploaderProps {
  imageUrl: string;
  onChange: (url: string) => void;
  altText?: string;
  emptyText?: string;
  helperText?: string;
  cmsKind?: CmsMediaKind;
  onDerivativesChange?: (derivatives: Record<string, string>) => void;
}

export default function ProductImageUploader({
  imageUrl,
  onChange,
  altText = localMessage('admin.imageUpload.alt'),
  emptyText = localMessage('admin.imageUpload.emptyText'),
  helperText = localMessage('admin.imageUpload.helperText'),
  cmsKind,
  onDerivativesChange,
}: ProductImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      if (cmsKind) {
        const result = await uploadApi.uploadCmsImage(file, cmsKind);
        onChange(result.original.url);
        onDerivativesChange?.(
          Object.fromEntries(
            Object.entries(result.derivatives).map(([variant, uploaded]) => [variant, uploaded.url]),
          ),
        );
      } else {
        const result = await uploadApi.uploadImage(file);
        onChange(result.url);
      }
      toast.success(toastMessage('imageUploadSuccess'));
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('imageUploadError')));
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="space-y-2">
      <div
        className={`relative flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={altText}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <span className="text-4xl">+</span>
            <p className="text-sm">{emptyText}</p>
            <p className="text-xs">{helperText}</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70">
            <span className="text-sm">{localMessage('admin.imageUpload.uploading')}</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
