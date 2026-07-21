import * as React from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";

export function Navbar({ className, brand, links, actions }: { className?: string; brand: React.ReactNode; links?: React.ReactNode; actions?: React.ReactNode }) {
  return <header className={cn("sticky top-0 z-40 w-full min-w-0 overflow-x-hidden border-b border-line bg-background/95 backdrop-blur", className)}><div className="mx-auto flex min-h-16 min-w-0 max-w-screen-2xl items-center gap-3 px-4 md:gap-5 md:px-6"><div className="min-w-0 flex-1 md:flex-none">{brand}</div><nav className="hidden flex-1 items-center gap-1 md:flex">{links}</nav><div className="ml-auto hidden items-center gap-2 md:flex">{actions}</div><Sheet><SheetTrigger asChild><Button variant="outline" size="icon" className="ml-auto shrink-0 md:hidden" aria-label="Open navigation"><Menu /></Button></SheetTrigger><SheetContent side="right"><div className="mt-10 grid gap-3">{links}<div className="mt-4 border-t border-line-muted pt-4">{actions}</div></div></SheetContent></Sheet></div></header>;
}
export function NavbarLink({ className, active, ...props }: React.ComponentProps<"a"> & { active?: boolean }) { return <a className={cn("inline-flex min-h-10 items-center border border-transparent px-3 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground hover:border-line hover:text-foreground", active && "border-signal bg-signal text-signal-foreground", className)} {...props} />; }
