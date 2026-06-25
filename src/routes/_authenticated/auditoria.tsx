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
import { DashboardLayout } from "@/components/layout/DashboardLayout";

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
      <DashboardLayout title="Auditoria">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Acesso restrito
            </CardTitle>
            <CardDescription>{(error as Error).message}</CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trilho de Auditoria</h1>
        <p className="text-sm text-muted-foreground">Quem fez o quê e quando — registado automaticamente.</p>
      </div>

      <BackupsCard />



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
                <div key={r.id} className="flex flex-col gap-2 p-4 text-sm md:grid md:grid-cols-[180px_200px_1fr] md:items-start md:gap-4">
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("pt-PT", { timeZone: "Africa/Maputo" })}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <Badge variant={opVariant(r.operation)}>{r.operation}</Badge>
                    <span className="text-xs truncate">{r.table_name}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.actor_email ?? r.actor_id ?? "sistema"}</div>
                    <div className="text-xs text-muted-foreground break-all">
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

function BackupsCard() {
  const fetchRuns = useServerFn(listBackupRuns);
  const runNow = useServerFn(runBackupNow);
  const getUrl = useServerFn(getBackupDownloadUrl);

  const { data: runs, refetch, isLoading } = useQuery({
    queryKey: ["backup-runs"],
    queryFn: () => fetchRuns(),
  });

  const trigger = useMutation({
    mutationFn: () => runNow(),
    onSuccess: () => { toast.success("Backup executado."); refetch(); },

    onError: (e: Error) => toast.error(e.message),
  });

  const download = async (path: string) => {
    try {
      const { url } = await getUrl({ data: { path } });
      window.open(url, "_blank", "noopener");
    } catch (e) { toast.error((e as Error).message); }
  };

  const fmtSize = (n?: number | null) =>
    !n ? "—" : n > 1_000_000 ? `${(n / 1_000_000).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" /> Backups automáticos
          </CardTitle>
          <CardDescription>
            Cron diário às 12:00 e 22:00 (Maputo). Snapshot completo guardado em armazenamento privado.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => trigger.mutate()} disabled={trigger.isPending}>
          <PlayCircle className="mr-1 h-4 w-4" />
          {trigger.isPending ? "A executar..." : "Executar agora"}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">A carregar...</p>
        ) : !runs || runs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Ainda não há backups. O primeiro será criado no próximo horário ou clica em "Executar agora".
          </p>
        ) : (
          <div className="divide-y">
            {runs.map((r: any) => (
              <div key={r.id} className="grid items-center gap-2 p-3 text-sm md:grid-cols-[160px_120px_1fr_auto]">
                <div className="text-xs text-muted-foreground">
                  {new Date(r.started_at).toLocaleString("pt-PT", { timeZone: "Africa/Maputo" })}
                </div>
                <Badge variant={r.status === "success" ? "default" : r.status === "error" ? "destructive" : "secondary"}>
                  {r.status} · {r.trigger}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {r.status === "success"
                    ? <>projetos: {r.projetos_count ?? 0} · lançamentos: {r.lancamentos_count ?? 0} · {fmtSize(r.size_bytes)}{r.drive_url ? " · ✓ Drive" : r.drive_error ? ` · Drive: ${r.drive_error}` : ""}</>
                    : r.error ?? "—"}
                </div>
                <div className="flex gap-2">
                  {r.drive_url && (
                    <a href={r.drive_url} target="_blank" rel="noreferrer" className="inline-flex">
                      <Button size="sm" variant="ghost">Drive</Button>
                    </a>
                  )}
                  {r.file_path && (
                    <Button size="sm" variant="outline" onClick={() => download(r.file_path)}>
                      <Download className="mr-1 h-4 w-4" /> Descarregar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
