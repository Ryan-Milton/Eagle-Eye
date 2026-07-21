import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) { return <span role="status" className={cn("inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider", className)}><LoaderCircle className="size-4 animate-spin" /><span>{label}</span></span>; }
