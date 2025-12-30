import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  variant?: 'default' | 'primary' | 'success';
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  icon: Icon, 
  label, 
  value,
  variant = 'default' 
}) => {
  return (
    <div className={cn(
      "glass-card p-4 flex items-center gap-4",
      variant === 'primary' && "border-primary/30 bg-primary/5",
      variant === 'success' && "border-success/30 bg-success/5"
    )}>
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center",
        variant === 'default' && "bg-secondary",
        variant === 'primary' && "bg-primary/20",
        variant === 'success' && "bg-success/20"
      )}>
        <Icon className={cn(
          "w-6 h-6",
          variant === 'default' && "text-muted-foreground",
          variant === 'primary' && "text-primary",
          variant === 'success' && "text-success"
        )} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
};

export default StatsCard;
