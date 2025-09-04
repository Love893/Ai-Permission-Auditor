import * as React from "react";
import { cn } from "../../lib/utils";

export function Separator({ className, ...props }) {
  return <hr className={cn("my-2 border-t border-slate-200", className)} {...props} />;
}
