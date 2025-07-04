import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardInfoProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function CardInfo({ title, value, subtitle, icon: Icon, iconColor = "bg-blue-100 text-medical-blue", trend }: CardInfoProps) {
  return (
    <Card className="shadow-sm border-slate-200 hover:shadow-md transition-all duration-200 hover:border-slate-300 group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 mb-2">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mb-2 group-hover:text-medical-blue transition-colors">
              {typeof value === 'number' ? value.toLocaleString() : value || '0'}
            </p>
            {trend && (
              <div className="flex items-center space-x-2">
                <p className={cn(
                  "text-sm font-medium",
                  trend.isPositive ? "text-medical-green" : "text-red-500"
                )}>
                  <span className="mr-1">
                    {trend.isPositive ? "↗" : "↘"}
                  </span>
                  {trend.value}
                </p>
                {trend.isPositive && (
                  <div className="w-1 h-1 bg-medical-green rounded-full animate-pulse" />
                )}
              </div>
            )}
            {subtitle && !trend && (
              <p className="text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-105", 
            iconColor
          )}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
