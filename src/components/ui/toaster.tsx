"use client";

import * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

type TechnicalTheme = "signal" | "schematic";
export type TechnicalToasterProps = Omit<ToasterProps, "theme"> & { theme?: ToasterProps["theme"] | TechnicalTheme };

function readTechnicalTheme(): TechnicalTheme {
  if (typeof document === "undefined") return "signal";
  return document.documentElement.dataset.theme === "schematic" ? "schematic" : "signal";
}

export function Toaster({ theme, ...props }: TechnicalToasterProps) {
  const [documentTheme, setDocumentTheme] = React.useState<TechnicalTheme>(readTechnicalTheme);
  React.useEffect(() => {
    if (theme || typeof document === "undefined") return;
    const observer = new MutationObserver(() => setDocumentTheme(readTechnicalTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [theme]);
  const resolvedTheme = theme === "signal" ? "dark" : theme === "schematic" ? "light" : theme ?? (documentTheme === "schematic" ? "light" : "dark");
  return <Sonner theme={resolvedTheme} toastOptions={{ classNames: { toast: "!rounded-none !border !border-line !bg-panel !text-foreground !shadow-hard", title: "!font-bold !uppercase !tracking-tight", description: "!text-muted-foreground", actionButton: "!rounded-none !bg-signal !text-signal-foreground !font-black !uppercase !tracking-wider", cancelButton: "!rounded-none !border !border-line !bg-background !text-foreground" } }} {...props} />;
}
