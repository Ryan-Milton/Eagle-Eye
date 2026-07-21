/* eslint-disable react-refresh/only-export-components */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-7 items-center gap-1.5 border px-2 py-1 font-sans text-[0.67rem] font-black uppercase leading-none tracking-[0.07em]",
  {
    variants: {
      variant: {
        outline: "border-current bg-transparent text-foreground",
        solid: "border-foreground bg-foreground text-background",
        signal: "border-signal bg-signal text-signal-foreground",
        muted: "border-line-muted bg-panel-subtle text-muted-foreground",
        danger: "border-danger bg-danger text-white",
        success: "border-success bg-success text-background",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
