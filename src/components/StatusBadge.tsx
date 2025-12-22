import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, X, Sparkles } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  size?: "sm" | "md";
}

const statusConfig: Record<string, { bg: string; icon: React.ReactNode }> = {
  new: {
    bg: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Sparkles className="h-3 w-3" />,
  },
  lead: {
    bg: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Sparkles className="h-3 w-3" />,
  },
  approved: {
    bg: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  booked: {
    bg: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  "needs work": {
    bg: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  "in progress": {
    bg: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: <Clock className="h-3 w-3" />,
  },
  contacted: {
    bg: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Clock className="h-3 w-3" />,
  },
  rejected: {
    bg: "bg-red-100 text-red-500 border-red-200",
    icon: <X className="h-3 w-3" />,
  },
  "not qualified": {
    bg: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <X className="h-3 w-3" />,
  },
};

const defaultConfig = {
  bg: "bg-blue-100 text-blue-700 border-blue-200",
  icon: <Clock className="h-3 w-3" />,
};

export const StatusBadge = ({ status, showIcon = true, size = "md" }: StatusBadgeProps) => {
  const config = statusConfig[status.toLowerCase()] || defaultConfig;
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";

  return (
    <Badge
      className={`${config.bg} border rounded-full font-medium inline-flex items-center gap-1.5 transition-all hover:opacity-90 ${sizeClasses}`}
    >
      {showIcon && config.icon}
      <span>{status}</span>
    </Badge>
  );
};

export const getStatusColor = (status: string): string => {
  const config = statusConfig[status.toLowerCase()] || defaultConfig;
  return config.bg;
};

export default StatusBadge;
