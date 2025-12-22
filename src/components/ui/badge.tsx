import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)]",
        secondary:
          "border-transparent bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground shadow-[0_2px_8px_-2px_hsl(var(--secondary)/0.4)]",
        destructive:
          "border-transparent bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground shadow-[0_2px_8px_-2px_hsl(var(--destructive)/0.4)]",
        success:
          "border-transparent bg-gradient-to-r from-success to-success/90 text-success-foreground shadow-[0_2px_8px_-2px_hsl(var(--success)/0.4)]",
        warning:
          "border-transparent bg-gradient-to-r from-warning to-warning/90 text-warning-foreground shadow-[0_2px_8px_-2px_hsl(var(--warning)/0.4)]",
        info:
          "border-transparent bg-gradient-to-r from-info to-info/90 text-info-foreground shadow-[0_2px_8px_-2px_hsl(var(--info)/0.4)]",
        outline:
          "border-2 border-border/50 text-foreground bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm",
        glass:
          "border border-white/20 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl text-foreground shadow-[0_2px_8px_-2px_rgb(0_0_0/0.1)]",
        gradient:
          "border-transparent bg-gradient-to-r from-primary to-emerald-500 text-white shadow-[0_2px_10px_-2px_rgb(0_0_0/0.2)]",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
