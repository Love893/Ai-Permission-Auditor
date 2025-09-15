// import * as React from "react";
// import { cn } from "../../lib/utils";

// export const Button = React.forwardRef(
//   ({ className, variant = "default", size = "default", ...props }, ref) => {
//     const base =
//       "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
//     const sizes = {
//       default: "h-10 px-4 py-2",
//       sm: "h-9 px-3",
//       lg: "h-11 px-6",
//       icon: "h-10 w-10",
//     };
//     const variants = {
//       default: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:ring-blue-400",
//       outline:
//         "bg-transparent text-slate-900 border border-slate-300 hover:bg-slate-50 focus:ring-slate-300",
//       ghost: "bg-transparent hover:bg-slate-100",
//       destructive:
//         "bg-red-600 text-white hover:bg-red-700 hover:text-white focus:ring-red-400",
//     };

//     return (
//       <button
//         ref={ref}
//         className={cn(base, sizes[size] || sizes.default, variants[variant] || variants.default, className)}
//         {...props}
//       />
//     );
//   }
// );
// Button.displayName = "Button";


import * as React from "react";
import { cn } from "../../lib/utils";

export const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 px-3",
      lg: "h-11 px-6",
      icon: "h-10 w-10",
    };
    const variants = {
      default: "bg-blue-600 text-white hover:text-white",
      outline:
        "bg-transparent text-slate-900 border border-slate-300 hover:bg-slate-50 focus:ring-slate-300",
      ghost: "bg-transparent hover:bg-slate-100",
      destructive:
        "bg-red-600 text-white hover:bg-red-700 hover:text-white focus:ring-red-400",
    };

    return (
      <button
        ref={ref}
        className={cn(base, sizes[size] || sizes.default, variants[variant] || variants.default, className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";