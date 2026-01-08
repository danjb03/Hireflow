import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Clock, Phone, Calendar as CalendarIcon, Users, FileText, Sparkles, CheckCircle2 } from "lucide-react";
import { formatDuration, getTodayDate } from "@/lib/reportingCalculations";
import hireflowLogo from "@/assets/hireflow-light.svg";

interface Rep {
  id: string;
  name: string;
}

interface AIExtraction {
  timeOnDialerMinutes: number;
  timeOnDialerHours: number;
  timeOnDialerMins: number;
  callsMade: number;
  confidence: number;
}

const RepReport = () => {
  const [reps, setReps] = useState<Rep[]>([]);
  const [isLoadingReps, setIsLoadingReps] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsingScreenshot, setIsParsingScreenshot] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [selectedRep, setSelectedRep] = useState("");
  const [reportDate, setReportDate] = useState(getTodayDate());
  const [timeHours, setTimeHours] = useState(0);
  const [timeMinutes, setTimeMinutes] = useState(0);
  const [callsMade, setCallsMade] = useState(0);
  const [bookingsMade, setBookingsMade] = useState(0);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [notes, setNotes] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [aiExtraction, setAiExtraction] = useState<AIExtraction | null>(null);

  useEffect(() => {
    loadReps();
  }, []);

  const loadReps = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-active-reps");
      if (error) throw error;
      setReps(data.reps || []);
    } catch (error: any) {
      console.error("Error loading reps:", error);
      toast.error("Failed to load reps");
    } finally {
      setIsLoadingReps(false);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setAiExtraction(null); // Reset AI extraction when new file selected
    }
  };

  const handleParseScreenshot = async () => {
    if (!screenshotPreview) {
      toast.error("Please upload a screenshot first");
      return;
    }

    setIsParsingScreenshot(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-screenshot", {
        body: { imageBase64: screenshotPreview }
      });

      if (error) throw error;

      if (data.success && data.extracted) {
        setAiExtraction(data.extracted);
        toast.success("Screenshot parsed successfully!");
      } else {
        throw new Error("Failed to parse screenshot");
      }
    } catch (error: any) {
      console.error("Error parsing screenshot:", error);
      toast.error("Failed to parse screenshot. Please enter values manually.");
    } finally {
      setIsParsingScreenshot(false);
    }
  };

  const applyAIValues = () => {
    if (aiExtraction) {
      setTimeHours(aiExtraction.timeOnDialerHours);
      setTimeMinutes(aiExtraction.timeOnDialerMins);
      setCallsMade(aiExtraction.callsMade);
      toast.success("AI values applied!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRep) {
      toast.error("Please select your name");
      return;
    }

    if (timeHours === 0 && timeMinutes === 0) {
      toast.error("Please enter time on dialer");
      return;
    }

    if (callsMade === 0) {
      toast.error("Please enter number of calls made");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload screenshot if present
      let screenshotPath = null;
      let screenshotUrl = null;

      if (screenshotFile) {
        const fileName = `${selectedRep}/${reportDate}_${Date.now()}.${screenshotFile.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('rep-screenshots')
          .upload(fileName, screenshotFile);

        if (uploadError) {
          console.error("Screenshot upload error:", uploadError);
          // Continue without screenshot
        } else {
          screenshotPath = uploadData.path;
          const { data: urlData } = supabase.storage
            .from('rep-screenshots')
            .getPublicUrl(uploadData.path);
          screenshotUrl = urlData.publicUrl;
        }
      }

      const totalMinutes = (timeHours * 60) + timeMinutes;

      const { data, error } = await supabase.functions.invoke("submit-daily-report", {
        body: {
          repId: selectedRep,
          reportDate,
          timeOnDialerMinutes: totalMinutes,
          callsMade,
          bookingsMade,
          pipelineValue,
          aiExtractedTimeMinutes: aiExtraction?.timeOnDialerMinutes || null,
          aiExtractedCalls: aiExtraction?.callsMade || null,
          aiConfidenceScore: aiExtraction?.confidence || null,
          screenshotPath,
          screenshotUrl,
          notes: notes.trim() || null,
        }
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Report submitted successfully!");

    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast.error(error.message || "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedRep("");
    setReportDate(getTodayDate());
    setTimeHours(0);
    setTimeMinutes(0);
    setCallsMade(0);
    setBookingsMade(0);
    setPipelineValue(0);
    setNotes("");
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setAiExtraction(null);
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Report Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Your daily report has been recorded successfully.
            </p>
            <Button onClick={resetForm} variant="outline">
              Submit Another Report
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={hireflowLogo} alt="Hireflow" className="h-8 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Daily Report</h1>
          <p className="text-muted-foreground">Submit your end of day stats</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rep Selection & Date */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Basic Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rep">Your Name *</Label>
                  {isLoadingReps ? (
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <Select value={selectedRep} onValueChange={setSelectedRep}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your name" />
                      </SelectTrigger>
                      <SelectContent>
                        {reps.map((rep) => (
                          <SelectItem key={rep.id} value={rep.id}>
                            {rep.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Report Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    max={getTodayDate()}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Screenshot Upload */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Close.com Screenshot
              </CardTitle>
              <CardDescription>
                Upload your daily stats screenshot for automatic parsing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                {screenshotPreview ? (
                  <div className="space-y-4">
                    <img
                      src={screenshotPreview}
                      alt="Screenshot preview"
                      className="max-h-48 mx-auto rounded-lg border"
                    />
                    <div className="flex gap-2 justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setScreenshotFile(null);
                          setScreenshotPreview(null);
                          setAiExtraction(null);
                        }}
                      >
                        Remove
                      </Button>
                      <Button
                        type="button"
                        onClick={handleParseScreenshot}
                        disabled={isParsingScreenshot}
                      >
                        {isParsingScreenshot ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Parsing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Parse with AI
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleScreenshotChange}
                    />
                    <div className="text-muted-foreground">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <p>Click to upload screenshot</p>
                      <p className="text-sm">PNG, JPG up to 10MB</p>
                    </div>
                  </label>
                )}
              </div>

              {/* AI Extraction Results */}
              {aiExtraction && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">AI Extracted Values</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700">
                      {Math.round(aiExtraction.confidence * 100)}% confident
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-blue-700">Time on Dialer:</span>
                      <span className="ml-2 font-medium">
                        {formatDuration(aiExtraction.timeOnDialerMinutes)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Calls Made:</span>
                      <span className="ml-2 font-medium">{aiExtraction.callsMade}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyAIValues}
                    className="w-full"
                  >
                    Use These Values
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Input */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Daily Stats
              </CardTitle>
              <CardDescription>
                Enter your numbers for the day (or use AI values above)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Time on Dialer */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time on Dialer *
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        value={timeHours}
                        onChange={(e) => setTimeHours(parseInt(e.target.value) || 0)}
                        placeholder="Hours"
                      />
                      <span className="text-xs text-muted-foreground">Hours</span>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={timeMinutes}
                        onChange={(e) => setTimeMinutes(parseInt(e.target.value) || 0)}
                        placeholder="Minutes"
                      />
                      <span className="text-xs text-muted-foreground">Minutes</span>
                    </div>
                  </div>
                </div>

                {/* Calls Made */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Calls Made *
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={callsMade}
                    onChange={(e) => setCallsMade(parseInt(e.target.value) || 0)}
                  />
                </div>

                {/* Bookings Made */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Bookings Made
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={bookingsMade}
                    onChange={(e) => setBookingsMade(parseInt(e.target.value) || 0)}
                  />
                </div>

                {/* Pipeline Value */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Pipeline (Warm Leads)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={pipelineValue}
                    onChange={(e) => setPipelineValue(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of interested prospects or callback leads generated
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Daily Notes
              </CardTitle>
              <CardDescription>
                What went well? What needs improvement?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Share your thoughts on the day, challenges faced, wins, areas for improvement..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={isSubmitting || isLoadingReps}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Daily Report"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default RepReport;
