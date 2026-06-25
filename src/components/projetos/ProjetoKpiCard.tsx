import type { ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Tone = "ok" | "warn" | "danger";

const TONE_COLOR: Record<Tone, string> = {
  ok: "text-emerald-600",
  warn: "text-amber-600",
  danger: "text-destructive",
};

interface Props {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
}

export function ProjetoKpiCard({ label, value, icon: Icon, tone }: Props) {
  const color = TONE_COLOR[tone];
  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <span className={`text-2xl font-semibold ${color}`}>{value}</span>
      </CardContent>
    </Card>
  );
}
