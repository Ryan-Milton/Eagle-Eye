"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

export function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) { return <CommandPrimitive className={cn("flex h-full w-full flex-col overflow-hidden bg-panel text-foreground", className)} {...props} />; }
export function CommandDialog({ title = "Command palette", children, ...props }: React.ComponentProps<typeof Dialog> & { title?: string }) { return <Dialog {...props}><DialogContent className="overflow-hidden p-0"><DialogTitle className="sr-only">{title}</DialogTitle><Command>{children}</Command></DialogContent></Dialog>; }
export function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) { return <div className="flex items-center border-b border-line px-3 focus-within:ring-2 focus-within:ring-focus focus-within:ring-inset"><Search className="mr-2 size-4 shrink-0 opacity-60" /><CommandPrimitive.Input className={cn("h-12 w-full bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground disabled:opacity-40", className)} {...props} /></div>; }
export function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) { return <CommandPrimitive.List className={cn("neo-scrollbar max-h-80 overflow-y-auto overflow-x-hidden", className)} {...props} />; }
export function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) { return <CommandPrimitive.Empty className={cn("py-8 text-center font-mono text-sm text-muted-foreground", className)} {...props} />; }
export function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) { return <CommandPrimitive.Group className={cn("overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:neo-kicker [&_[cmdk-group-heading]]:text-muted-foreground", className)} {...props} />; }
export function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) { return <CommandPrimitive.Separator className={cn("h-px bg-line-muted", className)} {...props} />; }
export function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) { return <CommandPrimitive.Item className={cn("relative flex min-h-10 select-none items-center gap-2 px-2 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset data-[disabled=true]:pointer-events-none data-[selected=true]:bg-signal data-[selected=true]:text-signal-foreground data-[disabled=true]:opacity-40", className)} {...props} />; }
export function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) { return <span className={cn("ml-auto text-[0.65rem] tracking-widest opacity-60", className)} {...props} />; }
