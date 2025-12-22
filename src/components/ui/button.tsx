import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-[0_4px_14px_-3px_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_20px_-3px_hsl(var(--primary)/0.5)] hover:from-primary/95 hover:to-primary",
        destructive:
          "bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground shadow-[0_4px_14px_-3px_hsl(var(--destructive)/0.4)] hover:shadow-[0_6px_20px_-3px_hsl(var(--destructive)/0.5)]",
        outline:
          "border-2 border-primary/20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/40 text-foreground",
        secondary:
          "bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground shadow-[0_4px_14px_-3px_hsl(var(--secondary)/0.4)] hover:shadow-[0_6px_20px_-3px_hsl(var(--secondary)/0.5)]",
        ghost:
          "hover:bg-primary/10 hover:text-primary",
        link:
          "text-primary underline-offset-4 hover:underline",
        glass:
          "bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_4px_16px_-4px_rgb(0_0_0/0.1)] hover:bg-white/80 dark:hover:bg-slate-800/80 hover:shadow-[0_8px_24px_-4px_rgb(0_0_0/0.15)]",
        gradient:
          "bg-gradient-to-r from-primary to-emerald-500 text-white shadow-[0_4px_20px_-4px_rgb(0_0_0/0.2)] hover:shadow-[0_8px_30px_-4px_rgb(0_0_0/0.3)] hover:brightness-110",
        success:
          "bg-gradient-to-r from-success to-success/90 text-success-foreground shadow-[0_4px_14px_-3px_hsl(var(--success)/0.4)] hover:shadow-[0_6px_20px_-3px_hsl(var(--success)/0.5)]",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
