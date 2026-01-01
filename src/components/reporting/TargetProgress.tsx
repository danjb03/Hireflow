import { getProgressColor, getProgressWidth, formatPercent } from "@/lib/reportingCalculations";

interface TargetProgressProps {
  label: string;
  actual: number | string;
  target: number;
  percent: number;
  unit?: string;
  showTarget?: boolean;
}

const TargetProgress = ({
  label,
  actual,
  target,
  percent,
  unit = "",
  showTarget = true,
}: TargetProgressProps) => {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {actual}{unit}
          {showTarget && <span className="text-muted-foreground"> / {target}{unit}</span>}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getProgressColor(percent)}`}
          style={{ width: `${getProgressWidth(percent)}%` }}
        />
      </div>
      <div className="text-xs text-right text-muted-foreground">
        {formatPercent(percent)}
      </div>
    </div>
  );
};

export default TargetProgress;
