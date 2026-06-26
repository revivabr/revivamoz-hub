import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  categoricalPalette as COLORS,
  tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle, legendStyle,
} from "@/lib/chart-theme";

type Lancamento = { tipo: "entrada" | "saida"; valor: number; categoria_id: string | null };
type Categoria = { id: string; nome: string };

function aggregate(lancs: Lancamento[], cats: Categoria[], tipo: "entrada" | "saida") {
  const map = new Map<string, number>();
  for (const l of lancs) {
    if (l.tipo !== tipo) continue;
    const key = l.categoria_id ?? "__none__";
    map.set(key, (map.get(key) ?? 0) + Number(l.valor || 0));
  }
  const nameOf = (id: string) =>
    id === "__none__" ? "Sem categoria" : cats.find((c) => c.id === id)?.nome ?? "Outros";
  return Array.from(map.entries())
    .map(([id, value]) => ({ name: nameOf(id), value }))
    .sort((a, b) => b.value - a.value);
}

function PieBlock({
  title, description, data, fmt,
}: {
  title: string;
  description: string;
  data: { name: string; value: number }[];
  fmt: (n: number) => string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Sem dados.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={800}
                  animationEasing="ease-out"
                  label={(e: { percent?: number }) =>
                    e.percent && e.percent > 0.05 ? `${Math.round(e.percent * 100)}%` : ""
                  }
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="var(--card)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => fmt(Number(v))}
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={legendStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CategoriaPies({
  lancamentos, categorias, fmt,
}: {
  lancamentos: Lancamento[];
  categorias: Categoria[];
  fmt: (n: number) => string;
}) {
  const entradas = useMemo(() => aggregate(lancamentos, categorias, "entrada"), [lancamentos, categorias]);
  const saidas = useMemo(() => aggregate(lancamentos, categorias, "saida"), [lancamentos, categorias]);

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <PieBlock title="Entradas por categoria" description="Distribuição percentual" data={entradas} fmt={fmt} />
      <PieBlock title="Saídas por categoria" description="Distribuição percentual" data={saidas} fmt={fmt} />
    </div>
  );
}
