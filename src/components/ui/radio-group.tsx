"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";

export function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) { return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-3", className)} {...props} />; }
export function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) { return <RadioGroupPrimitive.Item data-slot="radio-group-item" className={cn("aspect-square size-5 border border-line bg-background outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40 data-[state=checked]:border-signal", className)} {...props}><RadioGroupPrimitive.Indicator className="grid place-items-center"><span className="size-2.5 bg-signal" /></RadioGroupPrimitive.Indicator></RadioGroupPrimitive.Item>; }
