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
          ? 'bg-[#101013] border-[#10B981]/40 shadow-xs'
          : 'bg-[#101013] border-[#22222A] hover:border-[#33333F]'
      }`}
    >
      <div className="flex items-center justify-between text-xs text-[#7A7A84] mb-2 font-medium">
        <span>{title}</span>
        {icon && <span className="text-[#7A7A84]">{icon}</span>}
      </div>

      <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0F0F2] mb-1">
        {value}
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center gap-1.5 text-xs text-[#7A7A84]">
          {trend && (
            <span
              className={`font-medium ${
                trend.isPositive ? 'text-[#10B981]' : 'text-rose-400'
              }`}
            >
              {trend.value}
            </span>
          )}
          {trend && trend.label && <span>·</span>}
          {trend && trend.label && <span>{trend.label}</span>}
          {subtitle && !trend && <span>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
