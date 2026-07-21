import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export function Input({ className, type, ...props }: InputProps) { return <input data-slot="input" type={type} className={cn("flex min-h-11 w-full border border-input bg-background px-3 py-2 font-mono text-sm text-foreground shadow-none outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-focus focus-visible:ring-1 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger", className)} {...props} />; }
