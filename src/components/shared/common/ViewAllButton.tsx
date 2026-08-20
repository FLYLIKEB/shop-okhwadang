import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewAllButtonProps {
  href: string;
  label: string;
}

export default function ViewAllButton({ href, label }: ViewAllButtonProps) {
  return (
    <Button
      asChild
      type="button"
      variant="ghost"
      size="icon"
      className="h-10 min-h-10 w-10 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <Link href={href} prefetch={false} aria-label={label}>
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </Link>
    </Button>
  );
}
