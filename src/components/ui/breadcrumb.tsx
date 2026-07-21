import * as React from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export function Breadcrumb(props: React.ComponentProps<"nav">) { return <nav aria-label="breadcrumb" {...props} />; }
export function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) { return <ol className={cn("flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground", className)} {...props} />; }
export function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) { return <li className={cn("inline-flex items-center gap-2", className)} {...props} />; }
export function BreadcrumbLink({ asChild, className, ...props }: React.ComponentProps<"a"> & { asChild?: boolean }) { const Comp = asChild ? Slot : "a"; return <Comp className={cn("transition-colors hover:text-signal", className)} {...props} />; }
export function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) { return <span aria-current="page" className={cn("font-bold text-foreground", className)} {...props} />; }
export function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) { return <li role="presentation" aria-hidden className={cn("[&>svg]:size-3", className)} {...props}>{children ?? <ChevronRight />}</li>; }
export function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) { return <span role="presentation" aria-hidden className={cn("grid size-5 place-items-center", className)} {...props}><MoreHorizontal className="size-4" /></span>; }
