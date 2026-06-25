import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Small contextual help icon to be placed next to section titles.
 * Wrapped in the global TooltipProvider in the root layout.
 */
export function SectionInfo({ text, label = "Ajuda" }: { text: string; label?: string }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-center leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
