import { Badge } from "@/components/ui/badge";
import type { ProjetoEstado } from "@/lib/subprojetos/types";

const MAP: Record<ProjetoEstado, string> = {
  planeado: "secondary", ativo: "default", pausado: "outline",
  concluido: "secondary", cancelado: "destructive",
};

export function EstadoBadge({ estado }: { estado: ProjetoEstado }) {
  return <Badge variant={MAP[estado] as never}>{estado}</Badge>;
}
