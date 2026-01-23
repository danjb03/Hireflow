import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, Users, Bell, BellOff, Building2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface UserWithPreferences {
  id: string;
  email: string;
  clientName: string | null;
  leadNotificationsEnabled: boolean;
}

interface ClientWithUsers {
  clientId: string;
  clientName: string;
  users: UserWithPreferences[];
}

const AdminEmailSettings = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<ClientWithUsers[]>([]);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      setUserEmail(user.email || "");

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isAdmin = roles?.some((r) => r.role === "admin");
      if (!isAdmin) {
        toast.error("Access denied - Admin only");
        navigate("/admin");
        return;
      }

      await loadClientUsers();
    } catch (error) {
      console.error("Error checking admin:", error);
      toast.error("Failed to load data");
      navigate("/admin");
    } finally {
      setIsLoading(false);
    }
  };

  const loadClientUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-client-users");

      if (error) throw error;

      setClients(data?.clients || []);
    } catch (error) {
      console.error("Error loading client users:", error);
      toast.error("Failed to load client users");
    }
  };

  const handleToggleNotification = async (userId: string, currentValue: boolean) => {
    setUpdatingUser(userId);
    try {
      const { error } = await supabase.functions.invoke("update-notification-preference", {
        body: {
          userId,
          leadNotificationsEnabled: !currentValue
        }
      });

      if (error) throw error;

      // Update local state
      setClients(prev => prev.map(client => ({
        ...client,
        users: client.users.map(user =>
          user.id === userId
            ? { ...user, leadNotificationsEnabled: !currentValue }
            : user
        )
      })));

      toast.success(`Notifications ${!currentValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error("Error updating preference:", error);
      toast.error("Failed to update notification preference");
    } finally {
      setUpdatingUser(null);
    }
  };

  // Calculate stats
  const totalUsers = clients.reduce((sum, c) => sum + c.users.length, 0);
  const enabledUsers = clients.reduce(
    (sum, c) => sum + c.users.filter(u => u.leadNotificationsEnabled).length,
    0
  );

  if (isLoading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
          <div className="space-y-2">
            <div className="h-7 w-36 rounded-full bg-muted/60 animate-pulse" />
            <div className="h-8 w-56 bg-muted/60 rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted/60 rounded animate-pulse" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card
                key={i}
                className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <CardContent className="p-6">
                  <div className="h-4 w-20 bg-muted/60 rounded animate-pulse mb-2" />
                  <div className="h-8 w-12 bg-muted/60 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card
                key={i}
                className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <CardHeader className="pb-3">
                  <div className="h-6 w-40 bg-muted/60 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, j) => (
                      <div key={j} className="h-12 bg-muted/60 rounded animate-pulse" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
            <span className="size-2 rounded-full bg-[#34B192]" />
            Notification controls
          </div>
          <h1 className="text-3xl font-semibold text-[#222121]">
            <span className="text-[#222121]/40">Manage who gets</span>{" "}
            <span className="text-[#222121]">lead email alerts.</span>
          </h1>
          <p className="text-sm text-[#222121]/60">
            Toggle notifications for each client user and track overall coverage.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                <Building2 className="h-5 w-5 text-[#34B192]" />
              </div>
              <CardDescription className="text-xs font-medium uppercase tracking-wide text-[#222121]/50 mb-2">
                Total Clients
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums text-[#222121]">
                {clients.length}
              </CardTitle>
            </CardContent>
          </Card>
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                <Users className="h-5 w-5 text-[#34B192]" />
              </div>
              <CardDescription className="text-xs font-medium uppercase tracking-wide text-[#222121]/50 mb-2">
                Total Users
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums text-[#222121]">
                {totalUsers}
              </CardTitle>
            </CardContent>
          </Card>
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                <Bell className="h-5 w-5 text-[#34B192]" />
              </div>
              <CardDescription className="text-xs font-medium uppercase tracking-wide text-[#222121]/50 mb-2">
                Notifications On
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums text-[#222121]">
                {enabledUsers}
              </CardTitle>
            </CardContent>
          </Card>
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                <BellOff className="h-5 w-5 text-[#34B192]" />
              </div>
              <CardDescription className="text-xs font-medium uppercase tracking-wide text-[#222121]/50 mb-2">
                Notifications Off
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums text-[#222121]">
                {totalUsers - enabledUsers}
              </CardTitle>
            </CardContent>
          </Card>
        </div>

        {/* Client User List */}
        {clients.length === 0 ? (
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-[#222121]/30 mb-4" />
              <h3 className="text-lg font-medium mb-1">No Users Found</h3>
              <p className="text-[#222121]/60">
                No client users are attached to Airtable clients yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {clients.map((client) => (
              <Card
                key={client.clientId}
                className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-[#34B192]" />
                      <CardTitle className="text-lg text-[#222121]">{client.clientName}</CardTitle>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-[#222121]/10 bg-[#F5F5F5] text-xs font-medium text-[#222121]/70"
                    >
                      {client.users.length} user{client.users.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y divide-[#222121]/10">
                    {client.users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-[#222121]/40" />
                          <div>
                            <p className="text-sm font-medium text-[#222121]">{user.email}</p>
                            {user.clientName && (
                              <p className="text-xs text-[#222121]/60">
                                {user.clientName}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {user.leadNotificationsEnabled ? (
                            <Badge
                              variant="outline"
                              className="border-transparent bg-[#34B192] text-white gap-1"
                            >
                              <Bell className="h-3 w-3" />
                              On
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-transparent bg-[#9AA3A0] text-white gap-1"
                            >
                              <BellOff className="h-3 w-3" />
                              Off
                            </Badge>
                          )}
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`toggle-${user.id}`} className="text-xs text-[#222121]/50">
                              Lead Emails
                            </Label>
                            <Switch
                              id={`toggle-${user.id}`}
                              checked={user.leadNotificationsEnabled}
                              onCheckedChange={() => handleToggleNotification(user.id, user.leadNotificationsEnabled)}
                              disabled={updatingUser === user.id}
                            />
                            {updatingUser === user.id && (
                              <Loader2 className="h-4 w-4 animate-spin text-[#222121]/50" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEmailSettings;
