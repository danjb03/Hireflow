import { Card, CardContent } from "@/components/ui/card";
import { Users, Phone, Clock, Calendar, PoundSterling } from "lucide-react";
import { formatCurrency } from "@/lib/reportingCalculations";

interface TeamSummaryProps {
  team: {
    totalReps: number;
    reportsSubmittedToday: number;
    totalCalls: number;
    totalHours: number;
    totalBookings: number;
    totalPipeline: number;
    statusBreakdown: {
      ahead: number;
      onTrack: number;
      behind: number;
      critical: number;
      noReport: number;
    };
  };
}

const TeamSummary = ({ team }: TeamSummaryProps) => {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {team.reportsSubmittedToday}/{team.totalReps}
              </p>
              <p className="text-xs text-muted-foreground">Reports Today</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{team.totalCalls}</p>
              <p className="text-xs text-muted-foreground">Total Calls</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{team.totalHours}h</p>
              <p className="text-xs text-muted-foreground">Total Hours</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{team.totalBookings}</p>
              <p className="text-xs text-muted-foreground">Bookings</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <PoundSterling className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(team.totalPipeline)}</p>
              <p className="text-xs text-muted-foreground">Pipeline</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamSummary;
