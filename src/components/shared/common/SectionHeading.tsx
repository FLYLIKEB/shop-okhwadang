interface SectionHeadingProps {
  id?: string;
  label: string;
  title: string;
  description?: string;
}

export function SectionHeading({ id, label, title, description }: SectionHeadingProps) {
  return (
    <div className="mb-2 text-left">
      <span className="text-xs tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <h2 id={id} className="mt-2 font-display text-base font-medium text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-xl text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
