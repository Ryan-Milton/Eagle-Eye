import * as React from "react";
import { cn } from "@/lib/utils";

export function Stat({ className, label, value, detail, trend, signal = true }: { className?: string; label: string; value: React.ReactNode; detail?: React.ReactNode; trend?: "up" | "down" | "flat"; signal?: boolean }) { return <div className={cn("grid gap-2 border-l-4 pl-4", signal ? "border-signal" : "border-line", className)}><div className="neo-kicker text-muted-foreground">{label}</div><div className="neo-data text-3xl font-semibold">{value}</div>{detail ? <div className={cn("font-mono text-xs", trend === "up" && "text-success", trend === "down" && "text-danger", (!trend || trend === "flat") && "text-muted-foreground")}>{detail}</div> : null}</div>; }
