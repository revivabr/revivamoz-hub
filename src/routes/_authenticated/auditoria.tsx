import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listAuditLog, listBackupRuns, runBackupNow, getBackupDownloadUrl } from "@/lib/ops.functions";
import { ShieldAlert, Download, PlayCircle, Database } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/auditoria")({
  component: AuditoriaPage,
});


const TABELAS = [
  "projetos", "lancamentos", "projeto_membros",
  "projeto_convites", "user_roles", "ai_provedores",
];

function opVariant(op: string) {
  if (op === "INSERT") return "default" as const;
  if (op === "DELETE") return "destructive" as const;
  return "secondary" as const;
}

function AuditoriaPage() {
  const fetchAudit = useServerFn(listAuditLog);
  const [tabela, setTabela] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["audit", tabela],
    queryFn: () => fetchAudit({ data: { tableName: tabela || undefined, limit: 300 } }),
  });

  const rows = useMemo(() => {
    const list = data ?? [];
    if (!search.trim()) return list;
    const s = search.toLowerCase();
    return list.filter((r: any) =>
      (r.actor_email ?? "").toLowerCase().includes(s) ||
      (r.record_id ?? "").toLowerCase().includes(s) ||
      (r.table_name ?? "").toLowerCase().includes(s),
    );
  }, [data, search]);

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Acesso restrito
            </CardTitle>
            <CardDescription>{(error as Error).message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trilho de Auditoria</h1>
        <p className="text-sm text-muted-foreground">Quem fez o quê e quando — registado automaticamente.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row">
          <Select value={tabela || "all"} onValueChange={(v) => setTabela(v === "all" ? "" : v)}>
            <SelectTrigger className="sm:w-56"><SelectValue placeholder="Tabela" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tabelas</SelectItem>
              {TABELAS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Filtrar por e-mail, tabela ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-md"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">A carregar...</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Sem registos.</p>
          ) : (
            <div className="divide-y">
              {rows.map((r: any) => (
                <div key={r.id} className="grid gap-1 p-4 text-sm md:grid-cols-[180px_140px_1fr]">
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-PT", { timeZone: "Africa/Maputo" })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={opVariant(r.operation)}>{r.operation}</Badge>
                    <span className="text-xs">{r.table_name}</span>
                  </div>
                  <div>
                    <div className="font-medium">{r.actor_email ?? r.actor_id ?? "sistema"}</div>
                    <div className="text-xs text-muted-foreground">
                      id: <code>{r.record_id?.slice(0, 8)}…</code>
                      {r.projeto_id && <> · projeto: <code>{r.projeto_id.slice(0, 8)}…</code></>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
