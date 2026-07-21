"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
const sheetVariants = cva("neo-sheet fixed z-50 border-line bg-panel p-6 opacity-100 shadow-hard transition-opacity data-[state=closed]:opacity-0", { variants: { side: { right: "inset-y-0 right-0 h-full w-[min(90vw,28rem)] border-l", left: "inset-y-0 left-0 h-full w-[min(90vw,28rem)] border-r", top: "inset-x-0 top-0 border-b", bottom: "inset-x-0 bottom-0 border-t" } }, defaultVariants: { side: "right" } });
export function SheetContent({ className, children, side = "right", ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & VariantProps<typeof sheetVariants>) { return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-[var(--overlay)] opacity-100 transition-opacity data-[state=closed]:opacity-0" /><DialogPrimitive.Content data-side={side} className={cn(sheetVariants({ side }), className)} {...props}>{children}<DialogPrimitive.Close className="absolute right-3 top-3 grid size-9 place-items-center border border-line bg-background hover:bg-signal hover:text-signal-foreground"><X className="size-4" /><span className="sr-only">Close</span></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>; }
export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("grid gap-2 pr-10", className)} {...props} />; }
export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("mt-6 flex justify-end gap-3 border-t border-line-muted pt-5", className)} {...props} />; }
export function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) { return <DialogPrimitive.Title className={cn("neo-display text-3xl", className)} {...props} />; }
export function SheetDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) { return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />; }
