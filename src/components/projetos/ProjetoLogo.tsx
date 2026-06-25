import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const BUCKET = "projeto-logos";

/** Display the project logo at 16:9, with project-name fallback. */
export function ProjetoLogo({
  projetoId,
  nome,
  logoPath,
  className = "",
  rounded = "rounded-md",
}: {
  projetoId: string;
  nome: string;
  logoPath: string | null | undefined;
  className?: string;
  rounded?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!logoPath) { setUrl(null); return; }
    // SVG can render directly via signed URL; raster too. Use long-lived signed URL.
    supabase.storage.from(BUCKET).createSignedUrl(logoPath, 60 * 60).then(({ data }) => {
      if (alive) setUrl(data?.signedUrl ?? null);
    });
    return () => { alive = false; };
  }, [logoPath, projetoId]);

  return (
    <div
      className={`relative w-full overflow-hidden border bg-muted ${rounded} ${className}`}
      style={{ aspectRatio: "16 / 9" }}
    >
      {url ? (
        <img src={url} alt={nome} className="absolute inset-0 h-full w-full object-contain" />
      ) : (
        <div className="absolute inset-0 grid place-items-center px-3 text-center">
          <span className="line-clamp-2 text-sm font-semibold text-foreground/80">{nome}</span>
        </div>
      )}
    </div>
  );
}

/** Manager: upload / replace / remove a project logo (16:9 jpg/png/svg). */
export function ProjetoLogoUploader({
  projetoId,
  nome,
  logoPath,
  onChanged,
}: {
  projetoId: string;
  nome: string;
  logoPath: string | null;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    const okTypes = ["image/jpeg", "image/png", "image/svg+xml"];
    if (!okTypes.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou SVG.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Ficheiro acima de 4 MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${projetoId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (upErr) throw upErr;

      // Remove old file if any
      if (logoPath) await supabase.storage.from(BUCKET).remove([logoPath]);

      const { error: updErr } = await supabase
        .from("projetos").update({ logo_path: path }).eq("id", projetoId);
      if (updErr) throw updErr;
      toast.success("Logótipo atualizado.");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    if (!logoPath) return;
    setBusy(true);
    try {
      await supabase.storage.from(BUCKET).remove([logoPath]);
      const { error } = await supabase
        .from("projetos").update({ logo_path: null }).eq("id", projetoId);
      if (error) throw error;
      toast.success("Logótipo removido.");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <ProjetoLogo projetoId={projetoId} nome={nome} logoPath={logoPath} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/svg+xml"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
        />
        <Button size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Upload className="mr-1 h-4 w-4" /> {logoPath ? "Substituir" : "Carregar"} logótipo
        </Button>
        {logoPath && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>
            <Trash2 className="mr-1 h-4 w-4" /> Remover
          </Button>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ImageIcon className="h-3 w-3" /> JPG, PNG ou SVG · enquadramento 16:9 automático
        </span>
      </div>
    </div>
  );
}
