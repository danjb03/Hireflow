import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Image } from "lucide-react";
import TargetProgress from "./TargetProgress";
import {
  getStatusBgColor,
  getStatusLabel,
  formatDuration,
  formatCurrency,
  PerformanceStatus,
} from "@/lib/reportingCalculations";

interface RepPerformance {
  actual: number;
  target: number;
  percent: number;
  status: PerformanceStatus;
}

interface RepCardProps {
  rep: {
    id: string;
    name: string;
    email?: string;
  };
  today: {
    hasReport: boolean;
    calls: RepPerformance;
    hours: RepPerformance;
    bookings: RepPerformance;
    pipeline: RepPerformance;
    notes?: string | null;
    screenshotUrl?: string | null;
    submittedAt?: string | null;
  };
  weeklyStats: {
    reportsSubmitted: number;
    avgCalls: number;
    avgHours: number;
    avgBookings: number;
    totalPipeline: number;
  };
  overallStatus: PerformanceStatus;
  onViewDetails?: () => void;
}

const RepCard = ({
  rep,
  today,
  weeklyStats,
  overallStatus,
  onViewDetails,
}: RepCardProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{rep.name}</CardTitle>
            {rep.email && (
              <p className="text-sm text-muted-foreground">{rep.email}</p>
            )}
          </div>
          <Badge variant="outline" className={getStatusBgColor(overallStatus)}>
            {getStatusLabel(overallStatus)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {today.hasReport ? (
          <>
            {/* Today's Performance */}
            <div className="space-y-3">
              <TargetProgress
                label="Calls"
                actual={today.calls.actual}
                target={today.calls.target}
                percent={today.calls.percent}
              />
              <TargetProgress
                label="Hours on Dialer"
                actual={Math.round(today.hours.actual * 10) / 10}
                target={today.hours.target}
                percent={today.hours.percent}
                unit="h"
              />
              <TargetProgress
                label="Bookings"
                actual={today.bookings.actual}
                target={today.bookings.target}
                percent={today.bookings.percent}
              />
              <TargetProgress
                label="Pipeline"
                actual={formatCurrency(today.pipeline.actual)}
                target={today.pipeline.target}
                percent={today.pipeline.percent}
                showTarget={false}
              />
            </div>

            {/* Notes Preview */}
            {today.notes && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {today.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {today.screenshotUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(today.screenshotUrl!, '_blank')}
                >
                  <Image className="h-4 w-4 mr-1" />
                  Screenshot
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onViewDetails}
              >
                <Eye className="h-4 w-4 mr-1" />
                Details
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No report submitted today</p>
          </div>
        )}

        {/* Weekly Stats */}
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Last 7 Days
          </p>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <div>
              <p className="font-medium">{weeklyStats.reportsSubmitted}</p>
              <p className="text-xs text-muted-foreground">Reports</p>
            </div>
            <div>
              <p className="font-medium">{weeklyStats.avgCalls}</p>
              <p className="text-xs text-muted-foreground">Avg Calls</p>
            </div>
            <div>
              <p className="font-medium">{weeklyStats.avgHours}h</p>
              <p className="text-xs text-muted-foreground">Avg Hours</p>
            </div>
            <div>
              <p className="font-medium">{formatCurrency(weeklyStats.totalPipeline)}</p>
              <p className="text-xs text-muted-foreground">Pipeline</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RepCard;
