import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ className, icon, title, description, action }: { className?: string; icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return <div className={cn("neo-corners neo-grid-fine grid min-h-72 place-items-center border border-line bg-panel p-8 text-center", className)}><div className="max-w-md">{icon ? <div className="mx-auto mb-5 grid size-12 place-items-center border border-line bg-background text-signal">{icon}</div> : null}<h3 className="neo-display text-3xl">{title}</h3>{description ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}{action ? <div className="mt-6 flex justify-center">{action}</div> : null}</div></div>;
}
