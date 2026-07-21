import * as React from "react";
import { cn } from "@/lib/utils";

export function SystemStatus({ className, status = "online", label }: { className?: string; status?: "online" | "warning" | "offline" | "idle"; label?: string }) { const color = { online: "text-success", warning: "text-warning", offline: "text-danger", idle: "text-muted-foreground" }[status]; return <span className={cn("inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider", color, className)}><span className="neo-status-dot" aria-hidden="true" /><span>{label ?? status}</span></span>; }
