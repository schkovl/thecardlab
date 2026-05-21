import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: "teal" | "cyan" | "gold" | "red" | "violet" | "blue" | "green";
  className?: string;
}

export function Pill({ children, variant = "cyan", className, ...rest }: PillProps) {
  const variants = {
    teal: "text-[#b7fff0] bg-[#22d3a61f] border-[#22d3a655]",
    cyan: "text-[#bdf7ff] bg-[#00e5ff1f] border-[#00e5ff55]",
    gold: "text-[#ffe7b6] bg-[#f6b73c22] border-[#f6b73c55]",
    red: "text-[#ffd7dd] bg-[#ff4d6122] border-[#ff4d6155]",
    violet: "text-[#e5ddff] bg-[#7b61ff26] border-[#7b61ff66]",
    blue: "text-[#d8e8ff] bg-[#3b82f624] border-[#3b82f655]",
    green: "text-[#d9ffe7] bg-[#22c55e22] border-[#22c55e55]",
  };

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-black whitespace-nowrap border", variants[variant], className)} {...rest}>
      {children}
    </span>
  );
}
