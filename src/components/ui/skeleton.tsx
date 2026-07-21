import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div data-slot="skeleton" className={cn("animate-pulse-signal border border-line-muted bg-panel-subtle", className)} {...props} />; }
