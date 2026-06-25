// Reviva Moz — formatting helpers.
// Moeda sempre MZN. Fuso horário sempre Africa/Maputo (CAT, UTC+2).
// O idioma muda apenas a apresentação numérica/datas (separadores e nomes de mês).

const TIMEZONE = "Africa/Maputo";

export function formatMZN(
  value: number,
  opts: { compact?: boolean; locale?: string } = {},
): string {
  const locale = opts.locale ?? "pt-PT";
  if (opts.compact && Math.abs(value) >= 1_000_000) {
    return `MZN ${(value / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 2 })}M`;
  }
  if (opts.compact && Math.abs(value) >= 1_000) {
    return `MZN ${(value / 1_000).toLocaleString(locale, { maximumFractionDigits: 1 })}k`;
  }
  return `MZN ${value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(iso: string, locale = "pt-PT"): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE,
  });
}

export function formatDateTime(iso: string, locale = "pt-PT"): string {
  return new Date(iso).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });
}
