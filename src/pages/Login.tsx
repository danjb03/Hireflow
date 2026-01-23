import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

import hireflowLightLogo from "@/assets/hireflow-light.svg";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/client/dashboard`
          }
        });

        if (error) throw error;

        toast.success("Account created successfully! Please log in.");
        setIsSignUp(false);
        setPassword("");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Check user role
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);

        const isAdmin = roles?.some(r => r.role === "admin") || false;
        const isRep = roles?.some(r => r.role === "rep") || false;

        toast.success("Logged in successfully!");

        if (isAdmin) {
          navigate("/admin");
        } else if (isRep) {
          navigate("/rep/dashboard");
        } else {
          navigate("/client/dashboard");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F7F7] px-4 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,177,146,0.12),transparent_55%)]" />

      {/* Back to home */}
      <Link
        to="/"
        className="absolute left-6 top-6 z-20 flex items-center gap-2 text-sm text-[#222121]/60 transition-colors hover:text-[#222121]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to home</span>
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-[#222121]/[0.08] bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col items-center gap-6 text-center">
            <img src={hireflowLightLogo} alt="Hireflow" className="h-12" />
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-[#222121]">
                <span className="text-[#222121]/40">
                  {isSignUp ? "Create" : "Welcome"}
                </span>{" "}
                <span className="text-[#222121]">
                  {isSignUp ? "your account" : "back"}
                </span>
              </h1>
              <p className="text-sm text-[#222121]/60">
                {isSignUp
                  ? "Create an account to access your leads."
                  : "Sign in to access the client portal."}
              </p>
            </div>
          </div>

          <form onSubmit={handleAuth} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-[#222121]/70">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 rounded-xl border-[#222121]/10 bg-[#F7F7F7] text-[#222121] placeholder:text-[#222121]/40 focus-visible:border-[#34B192]/50 focus-visible:ring-[#34B192]/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-[#222121]/70">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
                className="h-12 rounded-xl border-[#222121]/10 bg-[#F7F7F7] text-[#222121] placeholder:text-[#222121]/40 focus-visible:border-[#34B192]/50 focus-visible:ring-[#34B192]/20"
              />
            </div>
            <Button
              type="submit"
              variant="ghost"
              className="h-12 w-full rounded-full bg-[#34B192] text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E] hover:shadow-[0_8px_24px_rgba(52,177,146,0.35)]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-[#222121]/60">
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={isLoading}
              className="text-sm text-[#222121]/60 hover:text-[#34B192]"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Need an account? Sign up"}
            </Button>
            {!isSignUp && (
              <div className="mt-2">
                <Link
                  to="/reset-password"
                  className="text-xs text-[#222121]/50 transition-colors hover:text-[#222121]/70"
                >
                  Forgot your password?
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
