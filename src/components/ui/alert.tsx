import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative grid gap-1 border-l-4 border-y border-r bg-panel px-4 py-3", {
  variants: {
    variant: {
      default: "border-foreground",
      signal: "border-signal",
      success: "border-success",
      warning: "border-warning",
      danger: "border-danger",
      info: "border-info",
    },
  },
  defaultVariants: { variant: "default" },
});

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>;
export function Alert({ className, variant, ...props }: AlertProps) { return <div role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />; }
export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) { return <h5 data-slot="alert-title" className={cn("neo-kicker text-foreground", className)} {...props} />; }
export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div data-slot="alert-description" className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />; }
