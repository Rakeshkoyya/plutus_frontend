import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Plutus brand emblem — a coin mark on the wealth-emerald gradient.
 * Named for the Greek god of wealth. Size it via `className` (the box)
 * and `iconClassName` (the glyph).
 */
export function BrandMark({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 shadow-soft",
        className,
      )}
    >
      <Coins className={cn("h-5 w-5 text-white", iconClassName)} />
    </span>
  );
}

export function Wordmark({
  subtitle = "Fee Management",
  showSubtitle = true,
  className,
}: {
  subtitle?: string;
  showSubtitle?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("leading-tight", className)}>
      <p className="text-sm font-semibold tracking-tight text-foreground">Plutus</p>
      {showSubtitle && (
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
