import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) { return <div className="neo-scrollbar relative w-full overflow-auto border border-line"><table className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props} /></div>; }
export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) { return <thead className={cn("border-b border-line [&_tr]:border-b [&_tr]:border-line", className)} {...props} />; }
export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) { return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />; }
export function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) { return <tfoot className={cn("border-t border-line bg-panel-subtle font-medium", className)} {...props} />; }
export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) { return <tr className={cn("border-b border-line-muted transition-colors hover:bg-panel-raised data-[state=selected]:bg-signal data-[state=selected]:text-signal-foreground", className)} {...props} />; }
export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) { return <th className={cn("h-11 px-3 text-left align-middle neo-kicker text-muted-foreground", className)} {...props} />; }
export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) { return <td className={cn("px-3 py-3 align-middle font-mono", className)} {...props} />; }
export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) { return <caption className={cn("mt-3 text-sm text-muted-foreground", className)} {...props} />; }
