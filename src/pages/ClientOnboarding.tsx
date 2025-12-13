import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";

const ClientOnboarding = () => {
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      // Check if onboarding is already completed
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .single();

      if (profile?.onboarding_completed) {
        navigate('/client/dashboard');
        return;
      }

      setChecking(false);
    };

    checkAuth();
  }, [navigate]);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);

        if (error) throw error;
      }
      navigate('/client/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setCompleting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Hireflow!</h1>
          <p className="text-muted-foreground mt-2">
            Let's get to know your business so we can find the perfect leads for you.
          </p>
        </div>
        
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <iframe 
            className="airtable-embed" 
            src="https://airtable.com/embed/appgiKk9WEjnLVPMm/pagjyw63ew9Gu0kBk/form" 
            frameBorder="0"
            width="100%" 
            height="600"
            style={{ background: 'transparent' }}
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Once you've submitted the form above, click below to continue to your dashboard.
          </p>
          <Button 
            onClick={handleComplete} 
            disabled={completing}
            size="lg"
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <CheckCircle className="h-4 w-4" />
            {completing ? "Please wait..." : "I've Completed the Form - Continue to Dashboard"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientOnboarding;

