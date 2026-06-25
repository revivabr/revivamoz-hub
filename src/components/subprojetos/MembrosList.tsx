import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Membro } from "@/lib/subprojetos/types";

export function MembrosList({
  projetoId, membros, currentUserId, isGestor,
}: { projetoId: string; membros: Membro[]; currentUserId: string; isGestor: boolean }) {
  const qc = useQueryClient();
  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projeto_membros").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["membros", projetoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Users className="h-4 w-4" /> Membros ({membros.length})
      </h3>
      <ul className="divide-y rounded-md border text-sm">
        {membros.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-3 py-2">
            <div>
              <div className="font-medium">{m.profiles?.full_name || "Sem nome"}</div>
              <Badge variant="outline" className="mt-1">{m.papel}</Badge>
            </div>
            {isGestor && m.user_id !== currentUserId && (
              <Button size="icon" variant="ghost" onClick={() => remover.mutate(m.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
