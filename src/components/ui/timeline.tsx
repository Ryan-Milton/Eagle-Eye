import * as React from "react";
import { cn } from "@/lib/utils";

export function Timeline({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) { return <ol className={cn("relative ml-1 border-l border-line-muted pl-6", className)} {...props} />; }
export function TimelineItem({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) { return <li className={cn("relative pb-8 last:pb-0 before:absolute before:-left-[1.82rem] before:top-1 before:size-3 before:border before:border-line before:bg-background", className)} {...props} />; }
export function TimelineTime({ className, ...props }: React.HTMLAttributes<HTMLTimeElement>) { return <time className={cn("neo-kicker text-muted-foreground", className)} {...props} />; }
export function TimelineTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) { return <h4 className={cn("mt-2 font-bold uppercase tracking-tight", className)} {...props} />; }
export function TimelineDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { return <p className={cn("mt-2 text-sm leading-relaxed text-muted-foreground", className)} {...props} />; }
