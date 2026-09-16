import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  value: string | number;
  label: string;
  icon: LucideIcon;
}

export default function MetricCard({ value, label, icon: Icon }: MetricCardProps) {
  return (
    <div className="bg-card rounded-lg p-6 border border-border relative shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-semibold text-foreground mb-1">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  );
}
