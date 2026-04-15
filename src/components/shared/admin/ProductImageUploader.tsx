'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadApi } from '@/lib/api';
import { handleApiError } from '@/utils/error';

interface ProductImageUploaderProps {
  imageUrl: string;
  onChange: (url: string) => void;
}

export default function ProductImageUploader({
  imageUrl,
  onChange,
}: ProductImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadApi.uploadImage(file);
      onChange(result.url);
      toast.success('이미지가 업로드되었습니다.');
    } catch (err) {
      toast.error(handleApiError(err, '이미지 업로드에 실패했습니다.'));
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
            alt="상품 이미지"
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <span className="text-4xl">+</span>
            <p className="text-sm">클릭하거나 드래그하여 이미지 업로드</p>
            <p className="text-xs">JPEG, PNG, WebP · 최대 5MB</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70">
            <span className="text-sm">업로드 중...</span>
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
