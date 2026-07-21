import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";

export function Pagination({ className, ...props }: React.ComponentProps<"nav">) { return <nav role="navigation" aria-label="pagination" className={cn("mx-auto flex w-full justify-center", className)} {...props} />; }
export function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) { return <ul className={cn("flex items-center gap-1", className)} {...props} />; }
export function PaginationItem(props: React.ComponentProps<"li">) { return <li {...props} />; }
export function PaginationLink({ className, isActive, size = "icon", ...props }: React.ComponentProps<"a"> & Pick<ButtonProps, "size"> & { isActive?: boolean }) { return <Button asChild variant={isActive ? "signal" : "ghost"} size={size} className={className}><a aria-current={isActive ? "page" : undefined} {...props} /></Button>; }
export function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) { return <PaginationLink aria-label="Go to previous page" size="md" className={cn("gap-1 px-3", className)} {...props}><ChevronLeft className="size-4" /><span>Prev</span></PaginationLink>; }
export function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) { return <PaginationLink aria-label="Go to next page" size="md" className={cn("gap-1 px-3", className)} {...props}><span>Next</span><ChevronRight className="size-4" /></PaginationLink>; }
export function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) { return <span aria-hidden className={cn("grid size-11 place-items-center", className)} {...props}><MoreHorizontal className="size-4" /></span>; }
