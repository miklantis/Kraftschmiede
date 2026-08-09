import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Optik 1:1 aus dem V1-"Klar"-Theme: 11px-Radius (rounded-control), 600er
// Schrift, kein Pillenrund, kein Druck-Versatz. Varianten gemappt auf V1:
// default = .btn.primary (gruen gefuellt), outline = .btn (weisse Karte mit
// Rahmen, Hover faerbt Rahmen + Text gruen), ghost = .btn.ghost (Akzenttext),
// destructive = .btn.danger (Rahmen + Danger-Text auf Weiss).
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-control border text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,filter] outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:brightness-105",
        outline:
          "border-border bg-card text-foreground hover:border-primary hover:text-primary",
        secondary:
          "border-transparent bg-muted text-foreground hover:brightness-[0.98]",
        ghost:
          "border-transparent bg-transparent text-primary hover:bg-primary/10",
        destructive:
          "border-danger/40 bg-card text-danger hover:bg-danger/10",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-3.5",
        xs: "h-6 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3",
        lg: "h-10 gap-1.5 px-4",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }): React.ReactElement {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
