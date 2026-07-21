import * as React from "react";
import { cn } from "@/lib/utils";

export function AppShell({ className, sidebar, header, children }: { className?: string; sidebar?: React.ReactNode; header?: React.ReactNode; children: React.ReactNode }) {
  return <div className={cn("neo-noise h-dvh overflow-hidden bg-background text-foreground", className)}><div className="flex h-full min-h-0">{sidebar ? <div className="hidden h-full shrink-0 lg:block">{sidebar}</div> : null}<div className="flex min-h-0 min-w-0 flex-1 flex-col">{header}<main className="neo-scrollbar min-h-0 w-full flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-screen-2xl p-4 md:p-6 lg:p-8">{children}</div></main></div></div></div>;
}
