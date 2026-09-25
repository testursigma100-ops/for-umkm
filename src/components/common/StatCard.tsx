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
      className={`p-4 rounded-xl border transition-all ${
        highlight
          ? 'bg-[#141416] border-[#242428]'
          : 'bg-[#141416] border-[#242428]'
      }`}
    >
      <div className="flex items-center justify-between text-xs text-[#8A8A91] mb-2 font-medium">
        <span className="truncate">{title}</span>
        {icon && <span className="shrink-0 text-[#8A8A91]">{icon}</span>}
      </div>

      <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F5F5] mb-1 tabular-nums">
        {value}
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center gap-1.5 text-xs text-[#8A8A91]">
          {trend && (
            <span
              className={`font-semibold tabular-nums ${
                trend.isPositive ? 'text-[#22C55E]' : 'text-red-400'
              }`}
            >
              {trend.value}
            </span>
          )}
          {trend && trend.label && <span className="text-[#8A8A91]">·</span>}
          {trend && trend.label && <span className="text-[#8A8A91]">{trend.label}</span>}
          {subtitle && !trend && <span className="truncate text-[#8A8A91]">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
