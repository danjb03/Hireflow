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

interface PeriodStats {
  reportsSubmitted: number;
  avgCalls: number;
  avgHours: number;
  avgBookings: number;
  totalPipeline: number;
  totalCalls?: number;
  totalHours?: number;
  totalBookings?: number;
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
  weeklyStats: PeriodStats;
  stats7Day?: PeriodStats;
  stats14Day?: PeriodStats;
  stats30Day?: PeriodStats;
  overallStatus: PerformanceStatus;
  onViewDetails?: () => void;
}

const RepCard = ({
  rep,
  today,
  weeklyStats,
  stats7Day,
  stats14Day,
  stats30Day,
  overallStatus,
  onViewDetails,
}: RepCardProps) => {
  // Use new stats if available, fallback to weeklyStats for backward compatibility
  const period7 = stats7Day || weeklyStats;
  const period14 = stats14Day;
  const period30 = stats30Day;
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

        {/* Period Stats - 7, 14, 30 Days */}
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Performance Summary
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-medium pb-2">Period</th>
                  <th className="text-center font-medium pb-2">Reports</th>
                  <th className="text-center font-medium pb-2">Avg Calls</th>
                  <th className="text-center font-medium pb-2">Avg Hours</th>
                  <th className="text-right font-medium pb-2">Pipeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr>
                  <td className="py-1.5 font-medium">7 Days</td>
                  <td className="py-1.5 text-center">{period7.reportsSubmitted}</td>
                  <td className="py-1.5 text-center">{period7.avgCalls}</td>
                  <td className="py-1.5 text-center">{period7.avgHours}h</td>
                  <td className="py-1.5 text-right">{formatCurrency(period7.totalPipeline)}</td>
                </tr>
                {period14 && (
                  <tr>
                    <td className="py-1.5 font-medium">14 Days</td>
                    <td className="py-1.5 text-center">{period14.reportsSubmitted}</td>
                    <td className="py-1.5 text-center">{period14.avgCalls}</td>
                    <td className="py-1.5 text-center">{period14.avgHours}h</td>
                    <td className="py-1.5 text-right">{formatCurrency(period14.totalPipeline)}</td>
                  </tr>
                )}
                {period30 && (
                  <tr>
                    <td className="py-1.5 font-medium">30 Days</td>
                    <td className="py-1.5 text-center">{period30.reportsSubmitted}</td>
                    <td className="py-1.5 text-center">{period30.avgCalls}</td>
                    <td className="py-1.5 text-center">{period30.avgHours}h</td>
                    <td className="py-1.5 text-right">{formatCurrency(period30.totalPipeline)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RepCard;
