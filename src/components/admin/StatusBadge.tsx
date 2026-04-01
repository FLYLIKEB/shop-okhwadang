interface StatusBadgeProps {
  isActive: boolean;
}

export function StatusBadge({ isActive }: StatusBadgeProps) {
  return (
    <span className={isActive ? 'text-green-600' : 'text-muted-foreground'}>
      {isActive ? '활성' : '비활성'}
    </span>
  );
}
