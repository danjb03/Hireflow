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
  { gradient: string; glow: string; icon: React.ReactNode }
> = {
  // Lead statuses
  new: {
    gradient:
      "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-[0_2px_10px_-2px_rgba(59,130,246,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(59,130,246,0.6)]",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  lead: {
    gradient:
      "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-[0_2px_10px_-2px_rgba(59,130,246,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(59,130,246,0.6)]",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  approved: {
    gradient:
      "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-[0_2px_10px_-2px_rgba(16,185,129,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(16,185,129,0.6)]",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  booked: {
    gradient:
      "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_2px_10px_-2px_rgba(16,185,129,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(16,185,129,0.6)]",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  "needs work": {
    gradient:
      "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_2px_10px_-2px_rgba(245,158,11,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(245,158,11,0.6)]",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  "in progress": {
    gradient:
      "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-[0_2px_10px_-2px_rgba(139,92,246,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(139,92,246,0.6)]",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  contacted: {
    gradient:
      "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-[0_2px_10px_-2px_rgba(14,165,233,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(14,165,233,0.6)]",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  rejected: {
    gradient:
      "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-[0_2px_10px_-2px_rgba(239,68,68,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(239,68,68,0.6)]",
    icon: <X className="h-3.5 w-3.5" />,
  },
  "not qualified": {
    gradient:
      "bg-gradient-to-r from-slate-400 to-gray-500 text-white shadow-[0_2px_10px_-2px_rgba(100,116,139,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(100,116,139,0.6)]",
    icon: <X className="h-3.5 w-3.5" />,
  },
  // Client sentiment statuses
  happy: {
    gradient:
      "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-[0_2px_10px_-2px_rgba(16,185,129,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(16,185,129,0.6)]",
    icon: <Smile className="h-3.5 w-3.5" />,
  },
  unhappy: {
    gradient:
      "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-[0_2px_10px_-2px_rgba(239,68,68,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(239,68,68,0.6)]",
    icon: <Frown className="h-3.5 w-3.5" />,
  },
  urgent: {
    gradient:
      "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_2px_10px_-2px_rgba(220,38,38,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(220,38,38,0.6)]",
    icon: <Zap className="h-3.5 w-3.5" />,
  },
  at_risk: {
    gradient:
      "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_2px_10px_-2px_rgba(245,158,11,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(245,158,11,0.6)]",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  on_track: {
    gradient:
      "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_2px_10px_-2px_rgba(16,185,129,0.5)]",
    glow: "hover:shadow-[0_4px_20px_-4px_rgba(16,185,129,0.6)]",
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
};

const defaultConfig = {
  gradient:
    "bg-gradient-to-r from-slate-500 to-gray-500 text-white shadow-[0_2px_10px_-2px_rgba(100,116,139,0.5)]",
  glow: "hover:shadow-[0_4px_20px_-4px_rgba(100,116,139,0.6)]",
  icon: <Clock className="h-3.5 w-3.5" />,
};

export const StatusBadge = ({
  status,
  showIcon = true,
  size = "md",
}: StatusBadgeProps) => {
  const config = statusConfig[status.toLowerCase()] || defaultConfig;

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-3 py-1 gap-1.5",
    lg: "text-sm px-4 py-1.5 gap-2",
  };

  return (
    <Badge
      className={cn(
        "border-0 rounded-full font-semibold inline-flex items-center transition-all duration-200",
        config.gradient,
        config.glow,
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
  return config.gradient;
};

export default StatusBadge;
