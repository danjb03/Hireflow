import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ClientOnboarding = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAlreadyLinked, setIsAlreadyLinked] = useState(false);
  const [clientName, setClientName] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login");
        return;
      }

      // Store user email for later
      setUserEmail(session.user.email || "");

      // Check if onboarding is already completed AND if already linked to Airtable
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, airtable_client_id, client_name')
        .eq('id', session.user.id)
        .single();

      if (profile?.onboarding_completed) {
        navigate('/client/dashboard');
        return;
      }

      // Check if already linked to Airtable client (but onboarding not marked complete)
      if (profile?.airtable_client_id) {
        setIsAlreadyLinked(true);
        setClientName(profile.client_name || "");
      }

      setChecking(false);
    };

    checkAuth();
  }, [navigate]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Call edge function to find and link the Airtable client record
      const { data, error } = await supabase.functions.invoke('complete-onboarding', {
        body: { email: userEmail }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Failed to complete onboarding");
      }

      toast.success("Welcome to Hireflow! Your onboarding is complete.");
      navigate('/client/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error(error instanceof Error ? error.message : "Failed to complete onboarding. Please make sure you've submitted the form.");
    } finally {
      setCompleting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
      </div>
    );
  }

  // If already linked, show a simplified view with skip option
  if (isAlreadyLinked) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold text-[#222121]">Welcome to Hireflow!</h1>
            <p className="mt-2 text-sm text-[#222121]/60">
              Your account is already set up and ready to go.
            </p>
          </div>

          <Card className="mb-6 border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-[#34B192]/10">
                  <CheckCircle2 className="h-7 w-7 text-[#34B192]" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-[#222121]">
                    You're All Set{clientName ? `, ${clientName}` : ''}!
                  </h3>
                  <p className="mt-1 text-sm text-[#222121]/60">
                    Your account has already been linked by your administrator. You can proceed directly to your dashboard.
                  </p>
                </div>
                <Button
                  onClick={handleComplete}
                  disabled={completing}
                  size="lg"
                  variant="ghost"
                  className="h-11 rounded-full bg-[#34B192] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
                >
                  {completing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Go to Dashboard
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base text-[#222121]">Need to update your details?</CardTitle>
              <CardDescription>
                If you haven't filled out the onboarding form yet, you can do so below. Otherwise, just click "Go to Dashboard" above.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <iframe
                className="airtable-embed"
                src="https://airtable.com/embed/appgiKk9WEjnLVPMm/pagjyw63ew9Gu0kBk/form"
                frameBorder="0"
                width="100%"
                height="400"
                style={{ background: 'transparent', border: '1px solid #E2E2E2', borderRadius: '16px' }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-[#222121]">Welcome to Hireflow!</h1>
          <p className="mt-2 text-sm text-[#222121]/60">
            Please complete the onboarding form below so we can find the perfect leads for you.
          </p>
        </div>

        <Card className="mb-6 border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-[#222121]">Client Onboarding Form</CardTitle>
            <CardDescription>
              Fill out all the required fields in the form below. Once you've submitted, click the "Complete Onboarding" button.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <iframe
              className="airtable-embed"
              src="https://airtable.com/embed/appgiKk9WEjnLVPMm/pagjyw63ew9Gu0kBk/form"
              frameBorder="0"
              width="100%"
              height="600"
              style={{ background: 'transparent', border: '1px solid #E2E2E2', borderRadius: '16px' }}
            />
          </CardContent>
        </Card>

        <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-[#222121]">Finished filling out the form?</h3>
                <p className="mt-1 text-sm text-[#222121]/60">
                  After you've submitted the Airtable form above, click the button below to complete your onboarding.
                </p>
              </div>
              <Button
                onClick={handleComplete}
                disabled={completing}
                size="lg"
                variant="ghost"
                className="h-11 rounded-full bg-[#34B192] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
              >
                {completing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Complete Onboarding
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientOnboarding;
