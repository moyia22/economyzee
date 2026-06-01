import { cn } from "@/lib/utils";

interface CardProps {
  className?: string;
  children: React.ReactNode;
  delay?: number;
  variant?: "default" | "glass" | "outline";
}

export function Card({
  className,
  children,
  delay,
  variant = "default",
}: CardProps) {
  const staggerClass = delay ? `stagger-${delay}` : "";
  
  const variantClasses = {
    default: "surface-card border border-border/60",
    glass: "glass border border-white/[0.06]",
    outline: "bg-transparent border border-border/80",
  };

  return (
    <div
      className={cn(
        "card-hover animate-fade-in-up rounded-xl p-5",
        variantClasses[variant],
        staggerClass,
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
