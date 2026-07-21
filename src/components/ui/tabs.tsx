"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) { return <TabsPrimitive.Root className={cn("grid gap-4", className)} {...props} />; }
export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) { return <TabsPrimitive.List className={cn("inline-flex w-fit border border-line bg-background p-1", className)} {...props} />; }
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) { return <TabsPrimitive.Trigger className={cn("min-h-9 border border-transparent px-3 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground outline-none data-[state=active]:border-signal data-[state=active]:bg-signal data-[state=active]:text-signal-foreground focus-visible:ring-2 focus-visible:ring-focus", className)} {...props} />; }
export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) { return <TabsPrimitive.Content className={cn("outline-none data-[state=active]:animate-enter", className)} {...props} />; }
