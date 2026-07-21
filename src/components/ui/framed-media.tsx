import * as React from "react";
import { cn } from "@/lib/utils";

export function FramedMedia({ className, children, label, overlay = true }: { className?: string; children: React.ReactNode; label?: React.ReactNode; overlay?: boolean }) {
  return <figure className={cn("neo-schematic-media neo-corners", className)}><div className={cn("relative", overlay && "after:absolute after:inset-0 after:bg-gradient-to-t after:from-background/80 after:to-transparent")}>{children}</div>{label ? <figcaption className="absolute bottom-4 left-4 z-10 border border-line bg-background px-2 py-1 neo-kicker">{label}</figcaption> : null}</figure>;
}
