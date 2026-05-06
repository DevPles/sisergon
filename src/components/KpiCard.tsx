import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'danger' | 'success';
  className?: string;
}

export const KpiCard = ({ label, value, subtitle, variant = 'default', className }: KpiCardProps) => (
  <Card className={cn(
    "relative overflow-hidden group hover:shadow-xl transition-all duration-300 cursor-default border-primary/10",
    className
  )}>
    <CardContent className="p-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider group-hover:text-[#1E40AF] transition-colors duration-300">
        {label}
      </p>
      <p className={cn(
        "text-2xl font-bold mt-1 transition-all duration-300",
        variant === 'danger' 
          ? 'text-destructive group-hover:text-[#1E40AF]' 
          : variant === 'success' 
            ? 'text-emerald-600 group-hover:text-[#1E40AF]' 
            : 'text-foreground group-hover:text-[#1E40AF]'
      )}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5 group-hover:text-[#1E40AF] transition-colors duration-300">
          {subtitle}
        </p>
      )}
    </CardContent>
  </Card>
);