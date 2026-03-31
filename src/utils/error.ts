import { toast } from 'sonner';

export function handleApiError(err: unknown, fallback: string): void {
  toast.error(err instanceof Error ? err.message : fallback);
}
