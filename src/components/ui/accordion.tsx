"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Accordion = AccordionPrimitive.Root;
export function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-line-muted", className)} {...props} />;
}
export function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return <AccordionPrimitive.Header className="flex"><AccordionPrimitive.Trigger className={cn("flex flex-1 items-center justify-between py-4 text-left font-bold uppercase tracking-tight outline-none hover:text-signal focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background [&[data-state=open]>svg]:rotate-180", className)} {...props}>{children}<ChevronDown className="size-4 shrink-0 transition-transform" /></AccordionPrimitive.Trigger></AccordionPrimitive.Header>;
}
export function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return <AccordionPrimitive.Content className="overflow-hidden text-sm data-[state=open]:animate-enter" {...props}><div className={cn("pb-5 leading-relaxed text-muted-foreground", className)}>{children}</div></AccordionPrimitive.Content>;
}
