import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7]">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
            <span className="size-2 rounded-full bg-[#34B192]" />
            Account settings
          </div>
          <h1 className="text-3xl font-semibold text-[#222121]">Settings</h1>
          <p className="text-sm text-[#222121]/60">Manage your account settings</p>
        </div>

        {/* Account Information */}
        <div className="space-y-6 rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <User className="h-5 w-5 text-[#34B192]" />
              </span>
              Account Information
            </h2>
            <p className="mb-4 text-sm text-[#222121]/60">Your account details</p>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-[#222121]">Email</Label>
              <Input 
                value={user?.email || ""} 
                disabled 
                className="mt-1 h-11 rounded-full border-[#222121]/15 bg-[#F5F5F5] text-sm text-[#222121]/60" 
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-[#222121]">Member Since</Label>
              <Input 
                value={new Date(user?.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} 
                disabled 
                className="mt-1 h-11 rounded-full border-[#222121]/15 bg-[#F5F5F5] text-sm text-[#222121]/60" 
              />
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="space-y-6 rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <Lock className="h-5 w-5 text-[#34B192]" />
              </span>
              Change Password
            </h2>
            <p className="mb-4 text-sm text-[#222121]/60">Update your password</p>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="current-password" className="text-sm font-medium text-[#222121]">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 h-11 rounded-full border-[#222121]/15 bg-white text-sm"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label htmlFor="new-password" className="text-sm font-medium text-[#222121]">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 h-11 rounded-full border-[#222121]/15 bg-white text-sm"
                placeholder="Enter new password"
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-sm font-medium text-[#222121]">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 h-11 rounded-full border-[#222121]/15 bg-white text-sm"
                placeholder="Confirm new password"
                required
              />
            </div>
            <p className="text-sm text-[#222121]/60">
              Password must be at least 6 characters long
            </p>
            <Button
              type="submit"
              disabled={isUpdating}
              variant="ghost"
              className="h-11 rounded-full bg-[#34B192] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
            >
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </div>

        {/* Support */}
        <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <LifeBuoy className="h-5 w-5 text-[#34B192]" />
              </span>
              Support
            </h2>
            <p className="mb-4 text-sm text-[#222121]/60">
              If you have any questions or need assistance, please reach out to our support team.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.href = "mailto:daniel@hireflow.uk"}
              className="h-10 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientSettings;
