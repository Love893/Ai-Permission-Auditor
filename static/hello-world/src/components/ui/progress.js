import { cn } from "../../lib/utils";

export function Progress({ value = 0, className, ...props }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={cn("h-2.5 mt-3 w-full overflow-hidden rounded-[3px] bg-slate-200", className)} {...props}>
      <div className="h-full bg-blue-600 transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}
