"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface ChartTooltipItem {
  dataKey?: string | number;
  name?: React.ReactNode;
  value?: React.ReactNode;
}

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: readonly ChartTooltipItem[];
  label?: React.ReactNode;
}

export function ChartFrame({ className, title, description, legend, children }: { className?: string; title?: string; description?: string; legend?: React.ReactNode; children: React.ReactElement }) {
  return <div className={cn("border border-line bg-panel", className)}>{(title || description || legend) ? <div className="flex flex-col gap-3 border-b border-line-muted p-4 sm:flex-row sm:items-end sm:justify-between"><div>{title ? <h3 className="neo-display text-2xl">{title}</h3> : null}{description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}</div>{legend}</div> : null}<div className="neo-grid-fine h-80 p-4"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></div>;
}
export function ChartLegend({ items, className }: { items: Array<{ label: string; color: string }>; className?: string }) { return <div className={cn("flex flex-wrap gap-3", className)}>{items.map((item) => <span key={item.label} className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground"><span className="size-2.5 border border-line" style={{ background: item.color }} />{item.label}</span>)}</div>; }
export function ChartTooltipContent({ active, payload, label }: ChartTooltipContentProps) { if (!active || !payload?.length) return null; return <div className="min-w-40 border border-line bg-panel p-3 shadow-hard"><div className="neo-kicker mb-2 text-muted-foreground">{label}</div>{payload.map((item, index) => <div key={String(item.dataKey ?? index)} className="flex justify-between gap-6 font-mono text-xs"><span>{item.name ?? item.dataKey}</span><strong>{item.value}</strong></div>)}</div>; }
