import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Smile,
  Frown,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<
  string,
  { color: string; icon: React.ReactNode }
> = {
  // Lead statuses
  new: {
    color: "border-transparent bg-[#3B82F6] text-white",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  lead: {
    color: "border-transparent bg-[#3B82F6] text-white",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  approved: {
    color: "border-transparent bg-[#34B192] text-white",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  booked: {
    color: "border-transparent bg-[#34B192] text-white",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  "needs work": {
    color: "border-transparent bg-[#F2B84B] text-white",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  "in progress": {
    color: "border-transparent bg-[#64748B] text-white",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  contacted: {
    color: "border-transparent bg-[#3B82F6] text-white",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  rejected: {
    color: "border-transparent bg-[#D64545] text-white",
    icon: <X className="h-3.5 w-3.5" />,
  },
  "not qualified": {
    color: "border-transparent bg-[#9AA3A0] text-white",
    icon: <X className="h-3.5 w-3.5" />,
  },
  // Client sentiment statuses
  happy: {
    color: "border-transparent bg-[#34B192] text-white",
    icon: <Smile className="h-3.5 w-3.5" />,
  },
  unhappy: {
    color: "border-transparent bg-[#D64545] text-white",
    icon: <Frown className="h-3.5 w-3.5" />,
  },
  urgent: {
    color: "border-transparent bg-[#C53030] text-white",
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  at_risk: {
    color: "border-transparent bg-[#F2B84B] text-white",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  on_track: {
    color: "border-transparent bg-[#34B192] text-white",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
};

const defaultConfig = {
  color: "border-transparent bg-[#9AA3A0] text-white",
  icon: <Clock className="h-3.5 w-3.5" />,
};

export const StatusBadge = ({
  status,
  showIcon = true,
  size = "md",
}: StatusBadgeProps) => {
  const config = statusConfig[status.toLowerCase()] || defaultConfig;

  const sizeClasses = {
    sm: "text-[10px] px-3 py-0.5 gap-1 h-5",
    md: "text-xs px-3 py-1 gap-1.5 h-6",
    lg: "text-sm px-4 py-1.5 gap-2 h-7",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border text-xs font-semibold inline-flex items-center justify-center whitespace-nowrap",
        config.color,
        sizeClasses[size]
      )}
    >
      {showIcon && config.icon}
      <span className="capitalize">{status.replace("_", " ")}</span>
    </Badge>
  );
};

export const getStatusColor = (status: string): string => {
  const config = statusConfig[status.toLowerCase()] || defaultConfig;
  return config.color;
};

export default StatusBadge;
