import type jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { marked, type Tokens } from "marked";

interface Ctx {
  doc: jsPDF;
  x: number;
  y: number;
  maxW: number;
  pageH: number;
  bottomMargin: number;
}

const LINE_H = 5;
const BODY_SIZE = 10;
const H_SIZES = [13, 12, 11.5, 11, 11, 11];

function ensureSpace(ctx: Ctx, needed = LINE_H) {
  if (ctx.y + needed > ctx.pageH - ctx.bottomMargin) {
    ctx.doc.addPage();
    ctx.y = 20;
  }
}

/** Render inline tokens with bold/italic/code styling. */
function renderInline(ctx: Ctx, tokens: Tokens.Generic[], baseStyle: "normal" | "bold" = "normal") {
  // Flatten to styled segments
  type Seg = { text: string; bold: boolean; italic: boolean; code: boolean };
  const segs: Seg[] = [];
  const walk = (toks: Tokens.Generic[], bold: boolean, italic: boolean) => {
    for (const t of toks) {
      switch (t.type) {
        case "text": {
          const txt = (t as Tokens.Text).text ?? "";
          if ((t as any).tokens) walk((t as any).tokens, bold, italic);
          else segs.push({ text: txt, bold, italic, code: false });
          break;
        }
        case "strong": walk((t as Tokens.Strong).tokens as Tokens.Generic[], true, italic); break;
        case "em": walk((t as Tokens.Em).tokens as Tokens.Generic[], bold, true); break;
        case "codespan": segs.push({ text: (t as Tokens.Codespan).text, bold, italic, code: true }); break;
        case "link": {
          const lt = t as Tokens.Link;
          walk(lt.tokens as Tokens.Generic[], bold, italic);
          break;
        }
        case "br": segs.push({ text: "\n", bold, italic, code: false }); break;
        case "del": walk((t as Tokens.Del).tokens as Tokens.Generic[], bold, italic); break;
        default: {
          const anyTxt = (t as any).text;
          if (typeof anyTxt === "string") segs.push({ text: anyTxt, bold, italic, code: false });
        }
      }
    }
  };
  walk(tokens, baseStyle === "bold", false);

  // Word-wrap manually preserving styles
  const doc = ctx.doc;
  let cursorX = ctx.x;
  const lineStartX = ctx.x;

  const flushNewline = () => {
    ctx.y += LINE_H;
    cursorX = lineStartX;
    ensureSpace(ctx);
  };

  for (const seg of segs) {
    const parts = seg.text.split(/(\s+)/);
    doc.setFont("helvetica", seg.bold ? (seg.italic ? "bolditalic" : "bold") : seg.italic ? "italic" : "normal");
    doc.setFontSize(BODY_SIZE);
    if (seg.code) doc.setFont("courier", seg.bold ? "bold" : "normal");

    for (const part of parts) {
      if (part === "") continue;
      if (part.includes("\n")) { flushNewline(); continue; }
      const w = doc.getTextWidth(part);
      if (cursorX + w > lineStartX + ctx.maxW && cursorX > lineStartX) {
        flushNewline();
        if (/^\s+$/.test(part)) continue;
      }
      ensureSpace(ctx);
      doc.setTextColor(seg.code ? 80 : 30);
      doc.text(part, cursorX, ctx.y);
      cursorX += w;
    }
  }
  ctx.y += LINE_H;
}

function renderTable(ctx: Ctx, tok: Tokens.Table) {
  const head = [tok.header.map((c) => c.text)];
  const body = tok.rows.map((row) => row.map((c) => c.text));
  autoTable(ctx.doc, {
    startY: ctx.y,
    head,
    body,
    margin: { left: ctx.x, right: ctx.x },
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [20, 83, 45], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 244] },
    theme: "grid",
  });
  // @ts-expect-error lastAutoTable injected by plugin
  ctx.y = (ctx.doc.lastAutoTable?.finalY ?? ctx.y) + 4;
}

function renderTokens(ctx: Ctx, tokens: Tokens.Generic[]) {
  for (const t of tokens) {
    ensureSpace(ctx);
    switch (t.type) {
      case "heading": {
        const h = t as Tokens.Heading;
        const size = H_SIZES[Math.min(h.depth - 1, H_SIZES.length - 1)];
        ctx.y += 1;
        ensureSpace(ctx, size);
        ctx.doc.setFont("helvetica", "bold");
        ctx.doc.setFontSize(size);
        ctx.doc.setTextColor(20, 83, 45);
        const lines = ctx.doc.splitTextToSize(h.text, ctx.maxW);
        for (const ln of lines) {
          ensureSpace(ctx, size);
          ctx.doc.text(ln, ctx.x, ctx.y);
          ctx.y += size * 0.45 + 2;
        }
        ctx.y += 1;
        break;
      }
      case "paragraph": {
        const p = t as Tokens.Paragraph;
        renderInline(ctx, p.tokens as Tokens.Generic[]);
        ctx.y += 1;
        break;
      }
      case "list": {
        const l = t as Tokens.List;
        let i = 1;
        for (const item of l.items) {
          const marker = l.ordered ? `${i++}. ` : "•  ";
          ctx.doc.setFont("helvetica", "normal");
          ctx.doc.setFontSize(BODY_SIZE);
          ctx.doc.setTextColor(30);
          ensureSpace(ctx);
          ctx.doc.text(marker, ctx.x, ctx.y);
          const saved = { x: ctx.x, maxW: ctx.maxW };
          ctx.x += 6; ctx.maxW -= 6;
          // item.tokens contains nested tokens (text/paragraph/list)
          renderTokens(ctx, (item.tokens as Tokens.Generic[]) ?? []);
          ctx.x = saved.x; ctx.maxW = saved.maxW;
        }
        ctx.y += 1;
        break;
      }
      case "text": {
        const tt = t as Tokens.Text;
        if ((tt as any).tokens) renderInline(ctx, (tt as any).tokens);
        else {
          ctx.doc.setFont("helvetica", "normal");
          ctx.doc.setFontSize(BODY_SIZE);
          ctx.doc.setTextColor(30);
          const lines = ctx.doc.splitTextToSize(tt.text, ctx.maxW);
          for (const ln of lines) { ensureSpace(ctx); ctx.doc.text(ln, ctx.x, ctx.y); ctx.y += LINE_H; }
        }
        break;
      }
      case "table": renderTable(ctx, t as Tokens.Table); break;
      case "blockquote": {
        const bq = t as Tokens.Blockquote;
        ctx.doc.setDrawColor(20, 83, 45);
        ctx.doc.setLineWidth(0.8);
        const startY = ctx.y - 3;
        const saved = { x: ctx.x, maxW: ctx.maxW };
        ctx.x += 4; ctx.maxW -= 4;
        renderTokens(ctx, bq.tokens as Tokens.Generic[]);
        ctx.doc.line(saved.x, startY, saved.x, ctx.y - 2);
        ctx.x = saved.x; ctx.maxW = saved.maxW;
        break;
      }
      case "hr": {
        ctx.y += 1;
        ctx.doc.setDrawColor(200);
        ctx.doc.setLineWidth(0.3);
        ctx.doc.line(ctx.x, ctx.y, ctx.x + ctx.maxW, ctx.y);
        ctx.y += 3;
        break;
      }
      case "code": {
        const c = t as Tokens.Code;
        ctx.doc.setFont("courier", "normal");
        ctx.doc.setFontSize(9);
        ctx.doc.setTextColor(60);
        const lines = ctx.doc.splitTextToSize(c.text, ctx.maxW - 4);
        const blockH = lines.length * LINE_H + 4;
        ensureSpace(ctx, blockH);
        ctx.doc.setFillColor(245, 247, 244);
        ctx.doc.rect(ctx.x, ctx.y - 3, ctx.maxW, blockH, "F");
        for (const ln of lines) { ctx.doc.text(ln, ctx.x + 2, ctx.y); ctx.y += LINE_H; }
        ctx.y += 2;
        break;
      }
      case "space": ctx.y += 2; break;
      default: {
        const txt = (t as any).text;
        if (typeof txt === "string") {
          ctx.doc.setFont("helvetica", "normal");
          ctx.doc.setFontSize(BODY_SIZE);
          ctx.doc.setTextColor(30);
          const lines = ctx.doc.splitTextToSize(txt, ctx.maxW);
          for (const ln of lines) { ensureSpace(ctx); ctx.doc.text(ln, ctx.x, ctx.y); ctx.y += LINE_H; }
        }
      }
    }
  }
}

export function renderMarkdownToPdf(
  doc: jsPDF,
  markdown: string,
  opts: { x: number; y: number; maxW: number; bottomMargin?: number }
): number {
  const ctx: Ctx = {
    doc,
    x: opts.x,
    y: opts.y,
    maxW: opts.maxW,
    pageH: doc.internal.pageSize.getHeight(),
    bottomMargin: opts.bottomMargin ?? 15,
  };
  const tokens = marked.lexer(markdown);
  renderTokens(ctx, tokens as Tokens.Generic[]);
  return ctx.y;
}
