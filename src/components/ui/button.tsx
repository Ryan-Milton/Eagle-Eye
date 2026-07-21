/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex min-h-11 items-center justify-center gap-2 border font-sans text-xs font-black uppercase tracking-[0.075em] transition-[transform,box-shadow,background-color,color,border-color] duration-150 ease-[var(--ease-primer)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0", {
  variants: {
    variant: {
      default: "border-foreground bg-foreground px-4 text-background hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-signal",
      signal: "border-signal bg-signal px-4 text-signal-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-signal-soft hover:shadow-hard",
      outline: "border-foreground bg-transparent px-4 text-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-foreground hover:text-background hover:shadow-signal",
      ghost: "border-transparent bg-transparent px-3 text-foreground hover:border-line hover:bg-panel-raised",
      danger: "border-danger bg-danger px-4 text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard",
      link: "min-h-0 border-0 bg-transparent p-0 text-foreground underline decoration-line-muted underline-offset-4 hover:decoration-signal",
    },
    size: { sm: "min-h-9 px-3 text-[0.68rem]", md: "min-h-11", lg: "min-h-13 px-6 text-sm", icon: "size-11 min-h-11 p-0" },
  },
  defaultVariants: { variant: "default", size: "md" },
});
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) { const Comp = asChild ? Slot : "button"; return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />; }
export { buttonVariants };
