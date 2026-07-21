"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) { return <SliderPrimitive.Root data-slot="slider" className={cn("relative flex w-full touch-none select-none items-center", className)} {...props}><SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden border border-line-muted bg-panel-subtle"><SliderPrimitive.Range className="absolute h-full bg-signal" /></SliderPrimitive.Track><SliderPrimitive.Thumb className="block size-5 border border-line bg-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40" /></SliderPrimitive.Root>; }
