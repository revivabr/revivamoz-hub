import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { despesasComparativas } from "@/lib/mock-data";
import { formatMZN } from "@/lib/format";
import { SectionInfo } from "@/components/ui/section-info";
import { useI18n } from "@/lib/i18n";

export function ExpensesBarChart() {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-base font-semibold text-foreground">Despesas Comparativas</h2>
          <SectionInfo text={t("tip.section.expenses")} />
        </div>
        <p className="text-xs text-muted-foreground">
          Custos por categoria entre PEPEs e obras ativas (MZN)
        </p>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={despesasComparativas} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="projeto"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)" }}
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                fontSize: 12,
              }}
              formatter={(value: number) => formatMZN(value)}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Salários" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Alimentação" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Infraestrutura" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
