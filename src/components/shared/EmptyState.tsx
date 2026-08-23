'use client'

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { StateFeedback } from '@/components/shared/StateFeedback';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <StateFeedback
      variant="storefront"
      tone="empty"
      icon={icon}
      title={title}
      description={description}
      action={
        action ? (
          <Button variant="black" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : undefined
      }
      className={className}
    />
  );
}
