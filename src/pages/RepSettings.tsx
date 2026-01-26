import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Key, LogOut } from "lucide-react";
import RepLayout from "@/components/RepLayout";

const RepSettings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login");
        return;
      }

      setUser(session.user);
      setIsLoading(false);
    };

    loadUser();
  }, [navigate]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error("Failed to change password: " + error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <RepLayout userEmail={user?.email}>
        <div className="flex min-h-[400px] items-center justify-center bg-[#F7F7F7]">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
        </div>
      </RepLayout>
    );
  }

  return (
    <RepLayout userEmail={user?.email}>
      <div className="-mx-4 -my-6 max-w-2xl space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
            <span className="size-2 rounded-full bg-[#34B192]" />
            Account settings
          </div>
          <h1 className="text-3xl font-semibold text-[#222121]">Settings</h1>
          <p className="text-sm text-[#222121]/60">Manage your account settings</p>
        </div>

        {/* Account Info */}
        <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-[#222121]">Account Information</CardTitle>
            <CardDescription className="text-[#222121]/60">Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#222121]">Email</Label>
              <Input value={user?.email || ""} disabled className="h-11 rounded-full border-[#222121]/15 bg-[#F5F5F5] text-sm text-[#222121]/60" />
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <Key className="h-5 w-5 text-[#34B192]" />
              </span>
              Change Password
            </CardTitle>
            <CardDescription className="text-[#222121]/60">Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium text-[#222121]">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                  className="h-11 rounded-full border-[#222121]/15 bg-white text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-[#222121]">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                  className="h-11 rounded-full border-[#222121]/15 bg-white text-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={changingPassword}
                variant="ghost"
                className="h-11 rounded-full bg-[#34B192] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <LogOut className="h-5 w-5 text-[#34B192]" />
              </span>
              Sign Out
            </CardTitle>
            <CardDescription className="text-[#222121]/60">Sign out of your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="h-10 rounded-full border-[#D64545]/40 text-[#D64545] hover:bg-[#FDF1F1]"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </RepLayout>
  );
};

export default RepSettings;
