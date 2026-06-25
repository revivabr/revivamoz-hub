import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CloudOff, CloudUpload } from "lucide-react";
import { getPending, flushQueue } from "@/lib/offline-queue";

export function OfflineBadge() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const refresh = () => setPending(getPending().length);
    refresh();
    const on = () => { setOnline(true); flushQueue().then(refresh); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("offline-queue-changed", refresh);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("offline-queue-changed", refresh);
    };
  }, []);

  if (online && pending === 0) return null;
  return (
    <Badge variant={online ? "secondary" : "destructive"} className="gap-1">
      {online ? <CloudUpload className="h-3 w-3" /> : <CloudOff className="h-3 w-3" />}
      {online ? `A sincronizar ${pending}` : `Offline${pending ? ` · ${pending} pendente${pending > 1 ? "s" : ""}` : ""}`}
    </Badge>
  );
}
