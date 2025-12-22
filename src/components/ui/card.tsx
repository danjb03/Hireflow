import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-2xl text-card-foreground transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_-8px_rgb(0_0_0/0.1),0_0_0_1px_rgb(255_255_255/0.5)_inset] dark:shadow-[0_8px_32px_-8px_rgb(0_0_0/0.4),0_0_0_1px_rgb(255_255_255/0.1)_inset]",
        glass: "bg-white/60 dark:bg-slate-900/50 backdrop-blur-2xl border border-white/30 dark:border-white/10 shadow-[0_8px_32px_-8px_rgb(0_0_0/0.08)]",
        solid: "bg-card border border-border shadow-sm",
        gradient: "bg-gradient-to-br from-primary/10 via-emerald-500/5 to-secondary/10 backdrop-blur-xl border border-white/20 dark:border-white/10",
        elevated: "bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/25 dark:border-white/10 shadow-[0_16px_48px_-12px_rgb(0_0_0/0.12)]",
      },
      hover: {
        none: "",
        lift: "hover:-translate-y-1 hover:shadow-[0_16px_48px_-12px_rgb(0_0_0/0.15)]",
        glow: "hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-8px_rgb(0_0_0/0.1),0_0_40px_-10px_hsl(160_84%_39%/0.3)]",
        scale: "hover:scale-[1.02] hover:shadow-[0_16px_48px_-12px_rgb(0_0_0/0.15)]",
      },
    },
    defaultVariants: {
      variant: "default",
      hover: "none",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, hover, className }))}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
