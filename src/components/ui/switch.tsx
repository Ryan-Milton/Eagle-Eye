"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) { return <SwitchPrimitive.Root data-slot="switch" className={cn("peer inline-flex h-6 w-11 shrink-0 items-center border border-line-muted bg-panel-subtle p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40 data-[state=checked]:border-signal data-[state=checked]:bg-signal", className)} {...props}><SwitchPrimitive.Thumb className="block size-4 bg-foreground transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-signal-foreground" /></SwitchPrimitive.Root>; }
