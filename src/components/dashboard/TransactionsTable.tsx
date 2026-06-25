import { Paperclip } from "lucide-react";
import { transacoes } from "@/lib/mock-data";
import { formatDate, formatMZN } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionInfo } from "@/components/ui/section-info";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function TransactionsTable() {
  const { t, locale } = useI18n();
  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-semibold text-foreground">{t("tx.title")}</h2>
            <SectionInfo text={t("tip.section.transactions")} />
          </div>
          <p className="text-xs text-muted-foreground">{t("tx.subtitle")}</p>
        </div>
        <button className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted">
          {t("tx.see_all")}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium sm:px-5">{t("tx.date")}</th>
              <th className="px-4 py-2.5 font-medium">{t("tx.project")}</th>
              <th className="px-4 py-2.5 font-medium">{t("tx.category")}</th>
              <th className="px-4 py-2.5 font-medium">{t("tx.type")}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t("tx.amount")}</th>
              <th className="px-4 py-2.5 text-center font-medium sm:px-5">{t("tx.receipt")}</th>
            </tr>
          </thead>
          <tbody>
            {transacoes.map((tx) => (
              <tr key={tx.id} className="border-t border-border transition hover:bg-muted/30">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground sm:px-5">
                  {formatDate(tx.data, locale)}
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{tx.projeto}</td>
                <td className="px-4 py-3 text-muted-foreground">{tx.categoria}</td>
                <td className="px-4 py-3">
                  <StatusBadge variant={tx.tipo}>
                    {tx.tipo === "entrada" ? t("tx.entrada") : t("tx.saida")}
                  </StatusBadge>
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums",
                    tx.tipo === "entrada" ? "text-success" : "text-destructive",
                  )}
                >
                  {tx.tipo === "entrada" ? "+" : "−"} {formatMZN(tx.valor, { locale })}
                </td>
                <td className="px-4 py-3 text-center sm:px-5">
                  {tx.comprovante ? (
                    <button
                      className="inline-grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label={t("tx.receipt")}
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
