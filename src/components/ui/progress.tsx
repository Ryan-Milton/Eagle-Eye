import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  label?: string;
}

export function Progress({ className, value = 0, max = 100, label, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ...props }: ProgressProps) {
  const generatedLabelId = React.useId();
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  const labelId = ariaLabelledBy ?? (label ? generatedLabelId : undefined);
  return <div className={cn("grid gap-2", className)} {...props}>{label ? <div className="flex justify-between font-mono text-xs"><span id={ariaLabelledBy ? undefined : generatedLabelId}>{label}</span><span>{Math.round(percent)}%</span></div> : null}<div role="progressbar" aria-label={ariaLabel} aria-labelledby={labelId} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} className="h-3 overflow-hidden border border-line-muted bg-panel-subtle"><div className="h-full bg-signal transition-[width] duration-300" style={{ width: `${percent}%` }} /></div></div>;
}
