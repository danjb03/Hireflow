import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageSquare, Star } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";

const ClientFeedback = () => {
  const navigate = useNavigate();
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedbackText.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to submit feedback");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("feedback")
        .insert({
          user_id: user.id,
          feedback_text: feedbackText.trim(),
          rating: rating,
        });

      if (error) throw error;

      toast.success("Thank you for your feedback!");
      setFeedbackText("");
      setRating(null);
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <MessageSquare className="h-6 w-6" />
              Submit Feedback
            </CardTitle>
            <CardDescription>
              We value your feedback! Let us know how we can improve our service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rating */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Rate Your Experience (Optional)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          rating && rating >= star
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Text */}
              <div className="space-y-2">
                <label htmlFor="feedback" className="text-sm font-medium">
                  Your Feedback
                </label>
                <Textarea
                  id="feedback"
                  placeholder="Tell us what you think about our service, leads quality, or any suggestions for improvement..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={8}
                  maxLength={2000}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {feedbackText.length}/2000 characters
                </p>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !feedbackText.trim()}
                className="w-full"
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
};

export default ClientFeedback;
