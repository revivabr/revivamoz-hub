import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { sendInviteEmail } from "@/lib/notifications.functions";
import { convitesProjetoQuery } from "@/lib/subprojetos/queries";
import { PAPEIS, type Papel } from "@/lib/subprojetos/types";

export function ConvitesSection({
  projetoId, projetoNome, currentUserId,
}: { projetoId: string; projetoNome: string; currentUserId: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Papel>("financiador");
  const sendInvite = useServerFn(sendInviteEmail);

  const { data: convites = [] } = useQuery(convitesProjetoQuery(projetoId, true));

  const invitar = useMutation({
    mutationFn: async () => {
      const target = email.trim().toLowerCase();
      const { error } = await supabase.from("projeto_convites").insert({
        projeto_id: projetoId, email: target, papel, convidado_por: currentUserId,
      });
      if (error) throw error;
      try {
        await sendInvite({ data: { email: target, projetoNome, papel } });
      } catch (e) {
        toast.warning(`Convite criado, mas falhou envio de e-mail: ${(e as Error).message}`);
      }
    },
    onSuccess: () => {
      toast.success("Convite criado e e-mail enviado.");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["convites", projetoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revogar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projeto_convites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["convites", projetoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Mail className="h-4 w-4" /> Convites
      </h3>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => { e.preventDefault(); if (email.trim()) invitar.mutate(); }}
      >
        <Input
          type="email" required placeholder="email@exemplo.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <Select value={papel} onValueChange={(v) => setPapel(v as Papel)}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAPEIS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={invitar.isPending}>
          <UserPlus className="mr-2 h-4 w-4" />Convidar
        </Button>
      </form>
      {convites.length > 0 && (
        <ul className="mt-3 divide-y rounded-md border text-sm">
          {convites.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <div className="font-medium">{c.email}</div>
                <div className="flex gap-2">
                  <Badge variant="outline">{c.papel}</Badge>
                  <Badge variant={c.estado === "aceite" ? "default" : "secondary"}>{c.estado}</Badge>
                </div>
              </div>
              {c.estado === "pendente" && (
                <Button size="icon" variant="ghost" onClick={() => revogar.mutate(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
