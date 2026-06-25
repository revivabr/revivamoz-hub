import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { distribuicaoCustos } from "@/lib/mock-data";
import { SectionInfo } from "@/components/ui/section-info";
import { useI18n } from "@/lib/i18n";

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-5)",
  "var(--color-chart-4)",
];

export function CostsDonutChart() {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-base font-semibold text-foreground">Distribuição de Custos Globais</h2>
          <SectionInfo text={t("tip.section.costs")} />
        </div>
        <p className="text-xs text-muted-foreground">Participação por categoria (%)</p>
      </div>
      <div className="grid flex-1 grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto]">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                formatter={(value: number) => `${value}%`}
              />
              <Pie
                data={distribuicaoCustos}
                dataKey="valor"
                nameKey="categoria"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                strokeWidth={0}
              >
                {distribuicaoCustos.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-2 text-xs">
          {distribuicaoCustos.map((item, i) => (
            <li key={item.categoria} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.categoria}</span>
              <span className="font-semibold text-foreground">{item.valor}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
