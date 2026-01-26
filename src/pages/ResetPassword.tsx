import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Lock, CheckCircle } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Get token from URL
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (tokenHash && type === "recovery") {
        // Exchange the token for a session
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

        if (!error && data.session) {
          setHasSession(true);
        }
      }

      // Also check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasSession(true);
      }

      setInitializing(false);
    };

    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Password updated",
        description: "Your password has been reset successfully.",
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
        <div className="w-full max-w-md rounded-2xl border border-[#222121]/10 bg-white p-8 space-y-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <Lock className="h-16 w-16 text-[#D64545] mx-auto" />
          <h1 className="text-2xl font-semibold text-[#222121]">Reset Link Invalid</h1>
          <p className="text-[#222121]/60">This link has expired or is invalid. Please request a new password reset.</p>
          <Button
            onClick={() => navigate("/login")}
            variant="outline"
            className="mt-4 h-10 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
        <div className="w-full max-w-md rounded-2xl border border-[#222121]/10 bg-white p-8 space-y-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CheckCircle className="h-16 w-16 text-[#34B192] mx-auto" />
          <h1 className="text-2xl font-semibold text-[#222121]">Password Reset Successful</h1>
          <p className="text-[#222121]/60">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7]">
      <div className="w-full max-w-md rounded-2xl border border-[#222121]/10 bg-white p-8 space-y-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="text-center space-y-2">
          <Lock className="h-12 w-12 text-[#34B192] mx-auto" />
          <h1 className="text-2xl font-semibold tracking-tight text-[#222121]">Reset Your Password</h1>
          <p className="text-sm text-[#222121]/60">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 rounded-full border-[#222121]/15 bg-white text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 rounded-full border-[#222121]/15 bg-white text-sm"
            />
          </div>

          <Button
            type="submit"
            variant="ghost"
            className="w-full h-11 rounded-full bg-[#34B192] text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
