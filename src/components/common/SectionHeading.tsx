interface SectionHeadingProps {
  id?: string;
  label: string;
  title: string;
  description?: string;
}

export function SectionHeading({ id, label, title, description }: SectionHeadingProps) {
  return (
    <div className="mb-12 text-center">
      <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <h2 id={id} className="mt-2 font-display-ko text-3xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      {description && (
        <p className="mt-3 max-w-xl mx-auto text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
