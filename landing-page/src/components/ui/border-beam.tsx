"use client";

import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function BorderBeam({
  className,
  size = 50,
  duration = 3,
  delay = 0,
  colorFrom = "#f97316", // orange-500
  colorTo = "#e11d48", // rose-500
}: BorderBeamProps) {
  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box]! [mask-composite:intersect]">
      <div
        className={cn(
          "absolute h-full w-full rounded-[inherit]",
          "opacity-[var(--beam-opacity)]",
          "transition-opacity",
          className
        )}
        style={
          {
            "--beam-size": `${size}px`,
            "--beam-duration": `${duration}s`,
            "--beam-delay": `${delay}s`,
            "--beam-color-from": colorFrom,
            "--beam-color-to": colorTo,
          } as React.CSSProperties
        }
      >
        <div className="absolute inset-0 animate-border-beam rounded-[inherit]" />
      </div>
    </div>
  );
}
