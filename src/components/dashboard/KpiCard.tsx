import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionInfo } from "@/components/ui/section-info";

export function KpiCard({
  title,
  value,
  delta,
  hint,
  icon: Icon,
  accent = "primary",
  tooltip,
}: {
  title: string;
  value: string;
  delta?: number;
  hint?: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "destructive" | "accent";
  tooltip?: string;
}) {
  const accentMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/12 text-destructive",
    accent: "bg-accent/25 text-accent-foreground",
  } as const;

  const isPositive = delta !== undefined && delta >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            {tooltip && <SectionInfo text={tooltip} />}
          </div>
          <p className="mt-2 truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {value}
          </p>
        </div>
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold",
              isPositive ? "bg-success/15 text-success" : "bg-destructive/12 text-destructive",
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {isPositive ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        )}
        {hint && <span className="truncate text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
