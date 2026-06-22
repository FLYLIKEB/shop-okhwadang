'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { handleApiError } from '@/utils/error'
import { Button } from '@/components/ui/button'
import { reviewsApi } from '@/lib/api'
import StarRating from './StarRating'
import { toastMessage } from '@/utils/toastMessages';
import { localMessage } from '@/utils/localMessages';

interface ReviewFormProps {
  productId: number
  orderItemId: number
  onSuccess: () => void
  onCancel: () => void
}

export default function ReviewForm({
  productId,
  orderItemId,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (imageUrls.length + files.length > 5) {
      toast.error(toastMessage('reviewImageLimit'))
      return
    }

    setIsUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const result = await reviewsApi.uploadImage(file)
        uploaded.push(result.url)
      }
      setImageUrls((prev) => [...prev, ...uploaded])
      toast.success(toastMessage('reviewImageUploadSuccess'))
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('imageUploadError')))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removeImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (rating === 0) {
      toast.error(toastMessage('ratingRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      await reviewsApi.create({
        productId,
        orderItemId,
        rating,
        content: content || null,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      })
      toast.success(toastMessage('reviewCreated'))
      onSuccess()
    } catch (err) {
      toast.error(handleApiError(err, toastMessage('reviewCreateError')))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 rounded-lg border border-border p-4">
      <h3 className="text-sm font-medium text-foreground">{localMessage('review.title')}</h3>

      {/* Star rating */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{localMessage('review.rating')}</span>
        <StarRating rating={rating} size="lg" interactive onChange={setRating} />
      </div>

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={localMessage('review.contentPlaceholder')}
        className="w-full min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {/* Image upload */}
      <div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading || imageUrls.length >= 5}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? localMessage('review.uploading') : localMessage('review.attachPhoto')}
          </Button>
          <span className="text-xs text-muted-foreground">{imageUrls.length}/5</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => void handleImageUpload(e)}
        />
        {imageUrls.length > 0 && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {imageUrls.map((url, idx) => (
              <div key={url} className="relative">
                <Image src={url} alt={localMessage('review.attachedImage', { index: idx + 1 })} width={64} height={64} className="rounded object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground"
                  aria-label={localMessage('review.deleteImage')}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting || rating === 0} size="sm">
          {isSubmitting ? localMessage('review.submitting') : localMessage('review.submit')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          {localMessage('review.cancel')}
        </Button>
      </div>
    </form>
  )
}
