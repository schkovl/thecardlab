import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HoloCardProps {
  children: ReactNode;
  className?: string;
}

export function HoloCard({ children, className }: HoloCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, rotateX: 8, rotateY: 8, boxShadow: "0 30px 70px rgba(0, 229, 255, 0.15)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "relative border border-border bg-gradient-to-br from-[#101f3adb] to-[#071225c7] shadow-[0_22px_70px_rgba(0,0,0,0.5)] rounded-[18px] overflow-hidden group",
        className
      )}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10 mix-blend-overlay" />
      
      {/* Sheen effect */}
      <div className="absolute -inset-full bg-gradient-to-br from-transparent via-white/10 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none z-20" />

      <div className="relative z-0 p-[18px]">
        {children}
      </div>
    </motion.div>
  );
}
