import * as React from "react";
import { cn } from "@/lib/utils";

export function DataList({ className, ...props }: React.HTMLAttributes<HTMLDListElement>) { return <dl className={cn("divide-y divide-line-muted border-y border-line-muted", className)} {...props} />; }
export function DataListItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("grid gap-2 py-3 sm:grid-cols-[minmax(9rem,0.4fr)_1fr]", className)} {...props} />; }
export function DataListTerm({ className, ...props }: React.HTMLAttributes<HTMLElement>) { return <dt className={cn("neo-kicker text-muted-foreground", className)} {...props} />; }
export function DataListValue({ className, ...props }: React.HTMLAttributes<HTMLElement>) { return <dd className={cn("font-mono text-sm text-foreground", className)} {...props} />; }
