import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Check, X, Pencil, Clock, Phone, Calendar, TrendingUp, ExternalLink } from "lucide-react";
import { formatDuration } from "@/lib/reportingCalculations";

interface Report {
  id: string;
  repName: string;
  reportDate: string;
  callsMade: number;
  timeOnDialerMinutes: number;
  bookingsMade: number;
  pipelineValue: number;
  notes: string | null;
  screenshotUrl: string | null;
  status: "pending" | "approved" | "rejected" | "edited";
  aiExtractedCalls: number | null;
  aiExtractedTimeMinutes: number | null;
  aiConfidenceScore: number | null;
  submittedAt: string;
}

interface ReportReviewDialogProps {
  report: Report | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewComplete: () => void;
}

const ReportReviewDialog = ({ report, open, onOpenChange, onReviewComplete }: ReportReviewDialogProps) => {
  const [activeTab, setActiveTab] = useState("review");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  // Edit form state
  const [editCalls, setEditCalls] = useState(0);
  const [editTimeHours, setEditTimeHours] = useState(0);
  const [editTimeMinutes, setEditTimeMinutes] = useState(0);
  const [editBookings, setEditBookings] = useState(0);
  const [editPipeline, setEditPipeline] = useState(0);

  // Initialize edit form when report changes
  useEffect(() => {
    if (report) {
      setEditCalls(report.callsMade);
      const hours = Math.floor(report.timeOnDialerMinutes / 60);
      const mins = report.timeOnDialerMinutes % 60;
      setEditTimeHours(hours);
      setEditTimeMinutes(mins);
      setEditBookings(report.bookingsMade);
      setEditPipeline(report.pipelineValue);
      setReviewNotes("");
      setActiveTab("review");
    }
  }, [report]);

  if (!report) return null;

  const handleAction = async (action: "approve" | "reject" | "edit") => {
    setIsSubmitting(true);
    try {
      const body: any = {
        reportId: report.id,
        action,
        reviewNotes: reviewNotes.trim() || undefined,
      };

      if (action === "edit") {
        body.callsMade = editCalls;
        body.timeOnDialerMinutes = (editTimeHours * 60) + editTimeMinutes;
        body.bookingsMade = editBookings;
        body.pipelineValue = editPipeline;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/review-report`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to review report");
      }

      toast.success(
        action === "approve" ? "Report approved" :
        action === "reject" ? "Report rejected" :
        "Report updated"
      );

      onOpenChange(false);
      onReviewComplete();

    } catch (error: any) {
      console.error("Error reviewing report:", error);
      toast.error(error.message || "Failed to review report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "edited":
        return <Badge className="bg-blue-500">Edited</Badge>;
      default:
        return <Badge variant="secondary">Pending Review</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Review Report: {report.repName}</span>
            {getStatusBadge(report.status)}
          </DialogTitle>
          <DialogDescription>
            {new Date(report.reportDate).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="edit">Edit Values</TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="space-y-4 mt-4">
            {/* Reported Values */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">Calls Made</span>
                </div>
                <p className="text-2xl font-bold">{report.callsMade}</p>
                {report.aiExtractedCalls && report.aiExtractedCalls !== report.callsMade && (
                  <p className="text-xs text-muted-foreground">
                    AI detected: {report.aiExtractedCalls}
                  </p>
                )}
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Time on Dialer</span>
                </div>
                <p className="text-2xl font-bold">{formatDuration(report.timeOnDialerMinutes)}</p>
                {report.aiExtractedTimeMinutes && report.aiExtractedTimeMinutes !== report.timeOnDialerMinutes && (
                  <p className="text-xs text-muted-foreground">
                    AI detected: {formatDuration(report.aiExtractedTimeMinutes)}
                  </p>
                )}
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Bookings</span>
                </div>
                <p className="text-2xl font-bold">{report.bookingsMade}</p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Pipeline</span>
                </div>
                <p className="text-2xl font-bold">{report.pipelineValue}</p>
              </div>
            </div>

            {/* AI Confidence */}
            {report.aiConfidenceScore && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  AI Parsing Confidence: {Math.round(report.aiConfidenceScore * 100)}%
                </p>
              </div>
            )}

            {/* Screenshot */}
            {report.screenshotUrl && (
              <div className="space-y-2">
                <Label>Screenshot Evidence</Label>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={report.screenshotUrl}
                    alt="Report screenshot"
                    className="max-h-64 w-full object-contain bg-slate-100"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(report.screenshotUrl!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Full Size
                </Button>
              </div>
            )}

            {/* Notes */}
            {report.notes && (
              <div className="space-y-2">
                <Label>Rep's Notes</Label>
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  {report.notes}
                </div>
              </div>
            )}

            {/* Review Notes */}
            <div className="space-y-2">
              <Label htmlFor="review-notes">Review Notes (Optional)</Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add any notes about this review..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => handleAction("reject")}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                Reject
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleAction("approve")}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Approve
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Edit the values and save. Original values will be preserved for audit.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-calls">Calls Made</Label>
                <Input
                  id="edit-calls"
                  type="number"
                  min="0"
                  value={editCalls}
                  onChange={(e) => setEditCalls(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Time on Dialer</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      value={editTimeHours}
                      onChange={(e) => setEditTimeHours(parseInt(e.target.value) || 0)}
                      placeholder="Hours"
                    />
                    <span className="text-xs text-muted-foreground">Hours</span>
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={editTimeMinutes}
                      onChange={(e) => setEditTimeMinutes(parseInt(e.target.value) || 0)}
                      placeholder="Mins"
                    />
                    <span className="text-xs text-muted-foreground">Minutes</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bookings">Bookings</Label>
                <Input
                  id="edit-bookings"
                  type="number"
                  min="0"
                  value={editBookings}
                  onChange={(e) => setEditBookings(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-pipeline">Pipeline (£)</Label>
                <Input
                  id="edit-pipeline"
                  type="number"
                  min="0"
                  step="100"
                  value={editPipeline}
                  onChange={(e) => setEditPipeline(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Review Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Reason for Edit</Label>
              <Textarea
                id="edit-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Explain why you're making these changes..."
                rows={3}
              />
            </div>

            {/* Save Edit Button */}
            <Button
              className="w-full"
              onClick={() => handleAction("edit")}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ReportReviewDialog;
