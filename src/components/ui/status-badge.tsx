import { cn } from "@/lib/utils";

type Variant = "entrada" | "saida" | "pendente";

const styles: Record<Variant, string> = {
  entrada: "bg-success/15 text-success",
  saida: "bg-destructive/12 text-destructive",
  pendente: "bg-warning/20 text-warning-foreground",
};

const labels: Record<Variant, string> = {
  entrada: "Entrada",
  saida: "Saída",
  pendente: "Pendente",
};

export function StatusBadge({
  variant,
  children,
  className,
}: {
  variant: Variant;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[variant],
        className,
      )}
    >
      {children ?? labels[variant]}
    </span>
  );
}
