// import * as React from "react";
// import { cn } from "../../lib/utils"

// export function Card({ className, ...props }) {
//   return <div className={cn("rounded-xl border bg-white text-slate-900 shadow-sm", className)} {...props} />;
// }
// export function CardContent({ className, ...props }) {
//   return <div className={cn("p-4", className)} {...props} />;
// }
// export function CardHeader({ className, ...props }) {
//   return <div className={cn("p-4 pb-2", className)} {...props} />;
// }
// export function CardTitle({ className, ...props }) {
//   return <div className={cn("text-base font-semibold", className)} {...props} />;
// }


import * as React from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return <div className={cn("rounded-[5px] bg-white text-slate-900 shadow-sm", className)} {...props} />;
}
export function CardContent({ className, ...props }) {
  return <div className={cn("p-2", className)} {...props} />;
}
export function CardHeader({ className, ...props }) {
  return <div className={cn("p-2 pb-2", className)} {...props} />;
}
export function CardTitle({ className, ...props }) {
  return <div className={cn("text-base font-semibold", className)} {...props} />;
}