import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, User, Lock, LifeBuoy } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";

const ClientSettings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
    setIsLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setIsUpdating(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Failed to update password: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <ClientLayout userEmail={user?.email}>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings</p>
        </div>

        {/* Account Information */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Your account details</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <Input 
                value={user?.email || ""} 
                disabled 
                className="mt-1 rounded-lg border bg-background bg-muted/50 text-muted-foreground" 
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Member Since</Label>
              <Input 
                value={new Date(user?.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} 
                disabled 
                className="mt-1 rounded-lg border bg-background bg-muted/50 text-muted-foreground" 
              />
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Update your password</p>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="current-password" className="text-sm font-medium">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 rounded-lg border bg-background"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 rounded-lg border bg-background"
                placeholder="Enter new password"
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 rounded-lg border bg-background"
                placeholder="Confirm new password"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Password must be at least 6 characters long
            </p>
            <Button type="submit" disabled={isUpdating} className="bg-primary hover:bg-primary/90">
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </div>

        {/* Support */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border rounded-xl p-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <LifeBuoy className="h-5 w-5" />
              Support
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              If you have any questions or need assistance, please reach out to our support team.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "mailto:support@hireflow.com"}>
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientSettings;
