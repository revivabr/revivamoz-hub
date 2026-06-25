import { useState } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export function ComprovantePreview({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const isPdf = path.toLowerCase().endsWith(".pdf");

  const openPreview = async () => {
    const { data, error } = await supabase.storage
      .from("comprovantes")
      .createSignedUrl(path, 300);
    if (error) { toast.error(error.message); return; }
    setUrl(data.signedUrl);
    setOpen(true);
  };

  return (
    <>
      <Button size="icon" variant="ghost" onClick={openPreview} title="Ver comprovante">
        {isPdf ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Comprovante</DialogTitle></DialogHeader>
          {url && (isPdf ? (
            <iframe src={url} className="h-[70vh] w-full rounded-md border" />
          ) : (
            <img src={url} alt="Comprovante" className="max-h-[70vh] w-full rounded-md border object-contain" />
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
