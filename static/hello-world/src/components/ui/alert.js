import * as React from "react";
import { cn } from "../../lib/utils";

export function Alert({ className, variant = "default", ...props }) {
  const variants = {
    default: "bg-slate-50 text-slate-900 border-slate-200",
    destructive: "bg-red-50 text-red-800 border-red-200",
  };
  return (
    <div className={cn("w-full rounded-md border p-3 text-sm", variants[variant], className)} {...props} />
  );
}

export function AlertDescription({ className, ...props }) {
  return <div className={cn("text-sm", className)} {...props} />;
}
