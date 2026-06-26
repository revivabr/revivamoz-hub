import type jsPDF from "jspdf";
import revivaLogoAsset from "@/assets/reviva-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";

const PROJ_BUCKET = "projeto-logos";

async function urlToDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadRevivaLogo(): Promise<string | null> {
  return urlToDataURL(revivaLogoAsset.url);
}

async function loadProjetoLogo(logoPath?: string | null): Promise<string | null> {
  if (!logoPath) return null;
  const { data } = await supabase.storage.from(PROJ_BUCKET).createSignedUrl(logoPath, 60 * 60);
  if (!data?.signedUrl) return null;
  return urlToDataURL(data.signedUrl);
}

export interface PdfHeaderOptions {
  title: string;
  subtitleLines?: string[];
  projetoLogoPath?: string | null;
}

/**
 * Draws a branded header on a jsPDF doc:
 *   [project logo]      TITLE (centered)      [Reviva logo]
 *                       subtitle lines
 *   ─────────────────────────────────────────────────────────
 * Returns the Y position where content should continue.
 */
export async function drawReportHeader(doc: jsPDF, opts: PdfHeaderOptions): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const headerH = 32;
  const logoMax = 26;

  const [reviva, projeto] = await Promise.all([
    loadRevivaLogo(),
    loadProjetoLogo(opts.projetoLogoPath),
  ]);

  // Soft background band
  doc.setFillColor(245, 247, 244);
  doc.rect(0, 0, pageW, headerH + 6, "F");

  // Project logo (left)
  if (projeto) {
    try {
      const props = doc.getImageProperties(projeto);
      const ratio = props.width / props.height;
      let w = logoMax * ratio;
      let h = logoMax;
      if (w > logoMax * 1.8) { w = logoMax * 1.8; h = w / ratio; }
      doc.addImage(projeto, "PNG", marginX, (headerH - h) / 2 + 3, w, h);
    } catch { /* ignore */ }
  }

  // Reviva logo (right)
  if (reviva) {
    try {
      const props = doc.getImageProperties(reviva);
      const ratio = props.width / props.height;
      const h = logoMax;
      const w = h * ratio;
      doc.addImage(reviva, "PNG", pageW - marginX - w, (headerH - h) / 2 + 3, w, h);
    } catch { /* ignore */ }
  }

  // Title (center)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(20, 83, 45);
  doc.text(opts.title, pageW / 2, 16, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  let y = 22;
  for (const line of opts.subtitleLines ?? []) {
    doc.text(line, pageW / 2, y, { align: "center" });
    y += 4.5;
  }

  // Divider
  doc.setDrawColor(20, 83, 45);
  doc.setLineWidth(0.6);
  doc.line(marginX, headerH + 6, pageW - marginX, headerH + 6);

  return headerH + 12;
}
