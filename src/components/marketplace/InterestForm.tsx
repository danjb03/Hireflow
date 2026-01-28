import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MarketplaceLead {
  id: string;
  displayName: string;
  industry: string | null;
  region: string | null;
  country: string | null;
  companySize: string | null;
  titlesOfRoles: string | null;
  marketplaceWriteup: string | null;
}

interface InterestFormProps {
  lead: MarketplaceLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InterestForm = ({ lead, open, onOpenChange }: InterestFormProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    companyName: "",
    message: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    setSubmitting(true);

    try {
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Build a summary for the lead
      const leadSummary = [
        lead.industry,
        lead.region || lead.country,
        lead.companySize ? `${lead.companySize} employees` : null,
      ]
        .filter(Boolean)
        .join(" - ");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-marketplace-interest`,
        {
          method: "POST",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contactName: formData.contactName,
            contactEmail: formData.contactEmail,
            contactPhone: formData.contactPhone || null,
            companyName: formData.companyName,
            message: formData.message || null,
            leadId: lead.id,
            leadSummary: leadSummary || "Marketplace Lead",
          }),
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setSubmitted(true);
      toast({
        title: "Interest Registered!",
        description: "Our team will be in touch shortly.",
      });
    } catch (error: any) {
      console.error("Error submitting interest:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to submit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after close animation
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        companyName: "",
        message: "",
      });
    }, 200);
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-[#222121]">
              Thank You!
            </h3>
            <p className="mb-6 text-sm text-[#222121]/60">
              We've received your interest and will be in touch within 24 hours.
            </p>
            <Button
              onClick={handleClose}
              className="rounded-full bg-violet-600 px-8 text-white hover:bg-violet-700"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#222121]">
            Express Your Interest
          </DialogTitle>
          <DialogDescription className="text-sm text-[#222121]/60">
            {lead && (
              <span>
                Interested in: <strong>{lead.industry || "Hiring Company"}</strong>
                {lead.region && ` in ${lead.region}`}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Your Name *</Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => updateField("contactName", e.target.value)}
                required
                placeholder="John Smith"
                className="h-11 rounded-xl border-[#222121]/15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                required
                placeholder="Acme Recruitment"
                className="h-11 rounded-xl border-[#222121]/15"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateField("contactEmail", e.target.value)}
                required
                placeholder="john@acme.com"
                className="h-11 rounded-xl border-[#222121]/15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Phone (Optional)</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => updateField("contactPhone", e.target.value)}
                placeholder="+44 7XXX XXX XXX"
                className="h-11 rounded-xl border-[#222121]/15"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => updateField("message", e.target.value)}
              placeholder="Tell us about your recruitment services and why you're interested in this opportunity..."
              rows={3}
              className="resize-none rounded-xl border-[#222121]/15"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 rounded-full border-[#222121]/15"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-full bg-violet-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.3)] hover:bg-violet-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Interest"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InterestForm;
