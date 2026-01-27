import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus, Search, Users, Shield, Headset, Building2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import AdminLayout from "@/components/AdminLayout";

interface User {
  id: string;
  email: string;
  client_name: string | null;
  created_at: string;
  roles: string[];
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    checkAdminAndLoadUsers();
  }, []);

  const checkAdminAndLoadUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/login");
        return;
      }
      setUserEmail(session.user.email || "");

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const isAdmin = roles?.some(r => r.role === "admin");
      if (!isAdmin) {
        toast.error("Access denied - Admin only");
        navigate("/dashboard");
        return;
      }

      await loadUsers();
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get all roles
      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Build a map of user_id -> roles
      const rolesMap: Record<string, string[]> = {};
      for (const role of allRoles || []) {
        if (!rolesMap[role.user_id]) {
          rolesMap[role.user_id] = [];
        }
        rolesMap[role.user_id].push(role.role);
      }

      // Combine profiles with roles
      const usersWithRoles: User[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        client_name: profile.client_name,
        created_at: profile.created_at,
        roles: rolesMap[profile.id] || ["client"]
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-user", {
        body: { userId: deleteUser.id }
      });

      if (error) throw error;

      toast.success("User deleted successfully");
      setUsers(users.filter(u => u.id !== deleteUser.id));
      setDeleteUser(null);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (roles: string[]) => {
    if (roles.includes("admin")) {
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Admin</Badge>;
    }
    if (roles.includes("rep")) {
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Rep</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Client</Badge>;
  };

  const getRoleIcon = (roles: string[]) => {
    if (roles.includes("admin")) {
      return <Shield className="h-4 w-4 text-purple-600" />;
    }
    if (roles.includes("rep")) {
      return <Headset className="h-4 w-4 text-blue-600" />;
    }
    return <Building2 className="h-4 w-4 text-slate-600" />;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    if (roleFilter === "all") return matchesSearch;
    if (roleFilter === "admin") return matchesSearch && user.roles.includes("admin");
    if (roleFilter === "rep") return matchesSearch && user.roles.includes("rep");
    if (roleFilter === "client") return matchesSearch && !user.roles.includes("admin") && !user.roles.includes("rep");

    return matchesSearch;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.roles.includes("admin")).length,
    reps: users.filter(u => u.roles.includes("rep")).length,
    clients: users.filter(u => !u.roles.includes("admin") && !u.roles.includes("rep")).length,
  };

  if (isLoading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="-mx-4 -my-6 flex items-center justify-center bg-[#F7F7F7] px-4 py-20 lg:-mx-6 lg:px-6">
          <Loader2 className="h-8 w-8 animate-spin text-[#222121]/40" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#222121]">
              <span className="size-2 rounded-full bg-[#222121]" />
              User management
            </div>
            <h1 className="text-3xl font-semibold text-[#222121]">
              <span className="text-[#222121]/40">Manage all</span>{" "}
              <span className="text-[#222121]">platform users.</span>
            </h1>
            <p className="text-sm text-[#222121]/60">
              View, invite, and remove users from the platform.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate("/admin/invite")}
              variant="outline"
              className="h-11 rounded-full border-[#222121]/10 bg-white px-5 text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
            >
              <Building2 className="mr-2 h-4 w-4" />
              Invite Client
            </Button>
            <Button
              onClick={() => navigate("/admin/invite-rep")}
              variant="ghost"
              className="h-11 rounded-full bg-[#222121] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(34,33,33,0.25)] transition-all hover:bg-[#333] hover:shadow-[0_8px_24px_rgba(34,33,33,0.35)]"
            >
              <Headset className="mr-2 h-4 w-4" />
              Invite Rep
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <Card
            hover="none"
            className="cursor-pointer border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            onClick={() => setRoleFilter("all")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#222121]/10">
                  <Users className="h-5 w-5 text-[#222121]" />
                </div>
                {roleFilter === "all" && <span className="size-2 rounded-full bg-[#222121]" />}
              </div>
              <div className="mt-3 text-2xl font-semibold tabular-nums text-[#222121]">
                {stats.total}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">
                Total Users
              </p>
            </CardContent>
          </Card>

          <Card
            hover="none"
            className="cursor-pointer border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            onClick={() => setRoleFilter("admin")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-full bg-purple-100">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                {roleFilter === "admin" && <span className="size-2 rounded-full bg-purple-600" />}
              </div>
              <div className="mt-3 text-2xl font-semibold tabular-nums text-[#222121]">
                {stats.admins}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">
                Admins
              </p>
            </CardContent>
          </Card>

          <Card
            hover="none"
            className="cursor-pointer border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            onClick={() => setRoleFilter("rep")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-100">
                  <Headset className="h-5 w-5 text-blue-600" />
                </div>
                {roleFilter === "rep" && <span className="size-2 rounded-full bg-blue-600" />}
              </div>
              <div className="mt-3 text-2xl font-semibold tabular-nums text-[#222121]">
                {stats.reps}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">
                Sales Reps
              </p>
            </CardContent>
          </Card>

          <Card
            hover="none"
            className="cursor-pointer border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
            onClick={() => setRoleFilter("client")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-full bg-slate-100">
                  <Building2 className="h-5 w-5 text-slate-600" />
                </div>
                {roleFilter === "client" && <span className="size-2 rounded-full bg-slate-600" />}
              </div>
              <div className="mt-3 text-2xl font-semibold tabular-nums text-[#222121]">
                {stats.clients}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">
                Clients
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card hover="none" className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold text-[#222121]">
                {roleFilter === "all" ? "All Users" :
                 roleFilter === "admin" ? "Admins" :
                 roleFilter === "rep" ? "Sales Reps" : "Clients"}
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#222121]/40" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 rounded-full border-[#222121]/10 bg-[#F7F7F7] pl-9 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-[#222121]/5">
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">User</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Role</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Company</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Joined</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/50 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-[#222121]/50 py-8">
                      {searchQuery ? "No users match your search." : "No users found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow key={user.id} className="border-[#222121]/5">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-[#222121]/5">
                            {getRoleIcon(user.roles)}
                          </div>
                          <div>
                            <p className="font-medium text-[#222121]">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.roles)}</TableCell>
                      <TableCell className="text-sm text-[#222121]/70">
                        {user.client_name || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-[#222121]/70">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteUser(user)}
                          className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                          disabled={user.email === userEmail}
                          title={user.email === userEmail ? "Cannot delete yourself" : "Delete user"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteUser?.email}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminUsers;
