import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Mail } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { meusConvitesQuery } from "@/lib/subprojetos/queries";

export function ConvitesParaMim() {
  const qc = useQueryClient();
  const { data: convites = [] } = useQuery(meusConvitesQuery);

  const aceitar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("accept_projeto_convite", { _convite_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Convite aceite. Bem-vindo ao projeto!");
      qc.invalidateQueries({ queryKey: ["meus-convites"] });
      qc.invalidateQueries({ queryKey: ["projetos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (convites.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />Convites pendentes para si
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-md border text-sm">
          {convites.map((c) => (
            <li key={c.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <div className="font-medium">{c.projetos?.nome ?? "Projeto"}</div>
                <Badge variant="outline" className="mt-1">{c.papel}</Badge>
              </div>
              <Button size="sm" onClick={() => aceitar.mutate(c.id)} disabled={aceitar.isPending}>
                <Check className="mr-2 h-4 w-4" />Aceitar
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
