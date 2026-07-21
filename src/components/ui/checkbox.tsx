"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return <CheckboxPrimitive.Root data-slot="checkbox" className={cn("peer size-5 shrink-0 border border-line bg-background text-signal-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:border-signal data-[state=checked]:bg-signal aria-invalid:border-danger", className)} {...props}><CheckboxPrimitive.Indicator className="grid place-items-center"><Check className="size-4 stroke-[3]" /></CheckboxPrimitive.Indicator></CheckboxPrimitive.Root>;
}
