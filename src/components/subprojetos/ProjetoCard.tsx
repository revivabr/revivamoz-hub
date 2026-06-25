import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjetoLogo } from "@/components/projetos/ProjetoLogo";
import { EstadoBadge } from "./EstadoBadge";
import { TIPO_LABEL, orcamentoLabel, type Projeto } from "@/lib/subprojetos/types";

export function ProjetoCard({ p, onOpenMembros }: { p: Projeto; onOpenMembros: () => void }) {
  return (
    <Card className="flex h-full flex-col transition hover:border-primary/60">
      <div className="p-3 pb-0">
        <ProjetoLogo projetoId={p.id} nome={p.nome} logoPath={p.logo_path} />
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{p.nome}</CardTitle>
          <EstadoBadge estado={p.estado} />
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          <Badge variant="outline" className="text-[10px]">{TIPO_LABEL[p.tipo]}</Badge>
        </div>
        <CardDescription className="line-clamp-2 min-h-[2.5rem]">
          {p.descricao || "Sem descrição"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 text-xs text-muted-foreground">
        {orcamentoLabel(p.tipo)}:{" "}
        <span className="font-medium text-foreground">
          {Number(p.orcamento).toLocaleString("pt-PT")} {p.moeda}
        </span>
      </CardContent>
      <div className="flex items-center justify-between gap-2 border-t p-3">
        <Button asChild size="sm" variant="default">
          <Link to="/projetos/$projetoId" params={{ projetoId: p.id }}>Abrir painel</Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={onOpenMembros}>
          <Users className="mr-1 h-4 w-4" />Membros
        </Button>
      </div>
    </Card>
  );
}
