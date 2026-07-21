"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;
export function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) { return <DialogPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-[var(--overlay)] opacity-100 backdrop-blur-[1px] transition-opacity data-[state=closed]:opacity-0", className)} {...props} />; }
export function DialogContent({ className, children, showCloseButton = true, ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  return <DialogPortal><DialogOverlay /><DialogPrimitive.Content data-slot="dialog-content" className={cn("fixed left-1/2 top-1/2 z-50 grid w-[min(92vw,38rem)] -translate-x-1/2 -translate-y-1/2 gap-5 border border-line bg-panel p-6 text-foreground opacity-100 shadow-signal transition-opacity data-[state=closed]:opacity-0", className)} {...props}>{children}{showCloseButton ? <DialogPrimitive.Close className="absolute right-3 top-3 grid size-9 place-items-center border border-line bg-background hover:bg-signal hover:text-signal-foreground"><X className="size-4" /><span className="sr-only">Close</span></DialogPrimitive.Close> : null}</DialogPrimitive.Content></DialogPortal>;
}
export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("grid gap-2 pr-10", className)} {...props} />; }
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn("flex flex-col-reverse gap-3 border-t border-line-muted pt-5 sm:flex-row sm:justify-end", className)} {...props} />; }
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) { return <DialogPrimitive.Title className={cn("neo-display text-3xl", className)} {...props} />; }
export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) { return <DialogPrimitive.Description className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />; }
