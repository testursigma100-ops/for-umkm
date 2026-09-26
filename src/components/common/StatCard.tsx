import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  highlight?: boolean;
}

export function StatCard({ title, value, subtitle, icon, trend, highlight }: StatCardProps) {
  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        highlight
          ? 'bg-[#151515] border-[#252525]'
          : 'bg-[#151515] border-[#252525]'
      }`}
    >
      <div className="flex items-center justify-between text-[10px] text-[#8A8A8A] mb-1.5 font-medium">
        <span className="truncate">{title}</span>
        {icon && <span className="shrink-0 text-[#8A8A8A]">{icon}</span>}
      </div>

      <div className="text-lg sm:text-xl font-bold tracking-tight text-[#F5F5F5] mb-0.5 tabular-nums">
        {value}
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center gap-1.5 text-[9px] text-[#8A8A8A]">
          {trend && (
            <span
              className={`font-semibold tabular-nums ${
                trend.isPositive ? 'text-[#22C55E]' : 'text-red-400'
              }`}
            >
              {trend.value}
            </span>
          )}
          {trend && trend.label && <span className="text-[#8A8A8A]">·</span>}
          {trend && trend.label && <span className="text-[#8A8A8A]">{trend.label}</span>}
          {subtitle && !trend && <span className="truncate text-[#8A8A8A]">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
