import { HoloCard } from "./HoloCard";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | ReactNode;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string | ReactNode;
  valueColor?: string;
  className?: string;
}

export function KpiCard({ title, value, trend, trendUp, subtitle, valueColor, className }: KpiCardProps) {
  return (
    <HoloCard className={className}>
      <div className="text-xs font-black text-[#b7c4d7] tracking-[0.5px] uppercase">{title}</div>
      <div className={cn("text-[30px] font-black tracking-tight mt-1", valueColor || "text-foreground")}>
        {value}
        {trend && (
          <span className={cn("text-sm ml-2", trendUp ? "text-secondary" : "text-destructive")}>
            {trendUp ? "▲" : "▼"} {trend}
          </span>
        )}
      </div>
      {subtitle && <div className="text-[10px] text-muted-foreground mt-1">{subtitle}</div>}
    </HoloCard>
  );
}
