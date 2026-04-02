'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadApi } from '@/lib/api';
import { handleApiError } from '@/utils/error';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/components/ui/utils';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const handleFile = async (file: File, targetIndex?: number) => {
    const tempUrl = `uploading-${Date.now()}`;
    
    if (targetIndex !== undefined) {
      setUploadingIndex(targetIndex);
    } else {
      const newImages = [...images, { url: tempUrl }];
      onChange(newImages);
      setUploadingIndex(newImages.length - 1);
    }

    try {
      const result = await uploadApi.uploadImage(file);
      const newImages = images.map((img, i) => 
        i === (targetIndex ?? images.length) ? { url: result.url } : img
      );
      if (targetIndex === undefined && images.length === newImages.length - 1) {
        onChange(newImages.slice(0, -1).concat({ url: result.url }));
      } else {
        onChange(newImages);
      }
      toast.success('이미지가 업로드되었습니다.');
    } catch (err) {
      toast.error(handleApiError(err, '이미지 업로드에 실패했습니다.'));
      onChange(images.filter((img) => img.url !== tempUrl));
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    
    files.forEach((file) => {
      if (images.length < maxImages) {
        void handleFile(file);
      }
    });
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => 
      accept.split(',').some((type) => f.type === type || f.type.startsWith(type.replace(/\/.*/, '/')))
    );
    const remaining = maxImages - images.length;
    files.slice(0, remaining).forEach((file) => void handleFile(file));
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const moveImage = (from: number, to: number) => {
    const newImages = [...images];
    const [moved] = newImages.splice(from, 1);
    newImages.splice(to, 0, moved);
    onChange(newImages);
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2',
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {images.map((img, index) => (
          <div
            key={img.url}
            className={cn(
              'relative aspect-square rounded-lg border overflow-hidden bg-muted group',
              img.url.startsWith('uploading-') && 'opacity-50',
            )}
          >
            {img.url.startsWith('uploading-') ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">업로드 중...</span>
              </div>
            ) : (
              <>
                <img
                  src={img.url}
                  alt={img.alt ?? `이미지 ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => index > 0 && moveImage(index, index - 1)}
                    disabled={index === 0}
                    className="p-1 rounded bg-white/20 text-white text-xs hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => index < images.length - 1 && moveImage(index, index + 1)}
                    disabled={index === images.length - 1}
                    className="p-1 rounded bg-white/20 text-white text-xs hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
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
            <span className="text-xs text-muted-foreground">추가</span>
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
          클릭하거나 드래그하여 이미지를 추가하세요. ({images.length}/{maxImages})
        </p>
      )}
    </div>
  );
}
