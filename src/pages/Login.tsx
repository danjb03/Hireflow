import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import hireflowLogo from "@/assets/hireflow-logo.svg";

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
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

      {/* Animated mesh gradient overlay */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/30 rounded-full blur-[128px] animate-pulse delay-1000" />
      </div>

      {/* Back to home */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors z-20"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Back to home</span>
      </Link>

      <div className="relative z-10 w-full max-w-md p-4">
        <Card variant="elevated" className="border-white/10 bg-white/5 backdrop-blur-2xl">
          <CardHeader className="space-y-6 pb-2">
            <div className="flex justify-center">
              <img src={hireflowLogo} alt="Hireflow" className="h-12" />
            </div>
            <div className="text-center space-y-2">
              <CardTitle className="text-2xl font-bold text-white">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </CardTitle>
              <CardDescription className="text-white/60">
                {isSignUp ? "Create an account to access your leads" : "Sign in to access the client portal"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:border-primary/50 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:border-primary/50 focus-visible:ring-primary/20"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait
                  </>
                ) : (
                  isSignUp ? "Create Account" : "Sign In"
                )}
              </Button>
            </form>
            <div className="mt-6 text-center space-y-3">
              <Button
                variant="link"
                onClick={() => setIsSignUp(!isSignUp)}
                disabled={isLoading}
                className="text-white/60 hover:text-white"
              >
                {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
              </Button>
              {!isSignUp && (
                <div>
                  <Link
                    to="/reset-password"
                    className="text-sm text-white/40 hover:text-white/60 transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
