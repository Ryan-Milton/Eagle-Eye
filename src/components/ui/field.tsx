import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

export function Field({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div data-slot="field" className={cn("grid gap-2", className)} {...props} />; }
export function FieldLabel(props: React.ComponentProps<typeof Label>) { return <Label data-slot="field-label" {...props} />; }
export function FieldDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { return <p data-slot="field-description" className={cn("text-xs leading-relaxed text-muted-foreground", className)} {...props} />; }
export function FieldError({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) { return <p data-slot="field-error" role="alert" className={cn("font-mono text-xs text-danger", className)} {...props} />; }
