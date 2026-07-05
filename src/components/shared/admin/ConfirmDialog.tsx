'use client';

import Modal from '@/components/ui/Modal';
import { cn } from '@/components/ui/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={open} onClose={onCancel} maxWidth="sm">
      <div className="space-y-4 pr-6">
        <div>
          <h2 className="typo-h3 font-semibold">{title}</h2>
          <p className="mt-2 whitespace-pre-line typo-body-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 typo-button hover:bg-muted">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'rounded-md px-4 py-2 typo-button text-primary-foreground',
              destructive ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
