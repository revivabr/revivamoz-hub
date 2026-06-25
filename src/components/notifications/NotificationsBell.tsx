import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listMyNotifications, markNotificationsRead } from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";

type Notif = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  link: string | null;
  lida: boolean;
  created_at: string;
};

export function NotificationsBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationsRead);

  const { data: items = [] } = useQuery<Notif[]>({
    queryKey: ["notificacoes"],
    queryFn: () => list(),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("notificacoes-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes" },
        () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const unread = items.filter((n) => !n.lida).length;
  const [open, setOpen] = useState(false);

  const markAll = useMutation({
    mutationFn: () => markRead({ data: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificacoes"] }),
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-foreground"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notificações</span>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate()}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Check className="h-3 w-3" /> Marcar todas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Sem notificações
            </p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={async () => {
                  if (!n.lida) await markRead({ data: { ids: [n.id] } });
                  qc.invalidateQueries({ queryKey: ["notificacoes"] });
                  if (n.link) {
                    setOpen(false);
                    navigate({ to: n.link });
                  }
                }}
                className={`flex w-full flex-col gap-0.5 border-b px-3 py-2 text-left text-xs transition hover:bg-accent ${
                  n.lida ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {!n.lida && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  <span className="font-semibold text-foreground">{n.titulo}</span>
                </div>
                <span className="text-muted-foreground">{n.mensagem}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString("pt-PT")}
                </span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
