import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02]",
        destructive:
          "bg-red-500 text-white shadow-md hover:bg-red-600 hover:shadow-red-500/20",
        outline:
          "border-2 border-orange-500/30 bg-transparent text-orange-400 hover:border-orange-500 hover:bg-orange-500/10",
        secondary:
          "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700",
        ghost: "hover:bg-slate-800 hover:text-orange-400",
        link: "text-orange-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg font-bold",
        icon: "h-10 w-10",
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

// Pulsating Button Variant
export const PulsatingButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & {
    pulseColor?: string;
    duration?: string;
  }
>(({ className, pulseColor = "#f97316", duration = "1.5s", ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        buttonVariants({ variant: "default" }),
        "relative overflow-visible"
      )}
      style={
        {
          "--pulse-color": pulseColor,
          "--duration": duration,
        } as React.CSSProperties
      }
      {...props}
    >
      <div className="relative z-10">{props.children}</div>
      <div className="absolute inset-0 -z-10 w-full h-full rounded-md animate-pulse bg-orange-500/30" />
    </button>
  );
});
PulsatingButton.displayName = "PulsatingButton";

// Border Beam Button
import { BorderBeam } from "./border-beam";

export const BorderBeamButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, children, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      {children}
      <BorderBeam size={25} duration={3} delay={0} colorFrom="#f97316" colorTo="#e11d48" />
    </Button>
  );
});
BorderBeamButton.displayName = "BorderBeamButton";

export { buttonVariants };
