import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Search, Play, Loader2, CheckCircle2, XCircle, Download, Users, Building2, Clock } from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface Job {
  id: string;
  created_at: string;
  status: string;
  airtable_client_id: string;
  config: any;
  progress: any;
  result_count: number;
  error: string | null;
}

const AdminListBuilder = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [targetTitles, setTargetTitles] = useState<string>("HR Director, Hiring Manager, VP of Talent");
  const [companySize, setCompanySize] = useState<string>("50,200");
  const [locations, setLocations] = useState<string>("United States, United Kingdom");
  const [jobKeywords, setJobKeywords] = useState<string>("Sales, Marketing");
  const [resultLimit, setResultLimit] = useState<number>(50);

  useEffect(() => {
    checkAdminAndLoadData();
    
    // Set up real-time subscription for job updates
    const channel = supabase
      .channel('list_building_jobs_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_building_jobs' }, () => {
        loadJobs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAdminAndLoadData = async () => {
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

      await Promise.all([loadClients(), loadJobs()]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadClients = async () => {
    const { data, error } = await supabase.functions.invoke("get-airtable-clients");
    if (error) throw error;
    setClients(data.clients || []);
  };

  const loadJobs = async () => {
    const { data, error } = await supabase.functions.invoke("get-list-building-jobs");
    if (error) throw error;
    setJobs(data.jobs || []);
  };

  const handleStartJob = async () => {
    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }

    setIsCreating(true);
    try {
      const config = {
        target_titles: targetTitles.split(",").map(t => t.trim()),
        company_size_ranges: companySize.split(",").map(s => s.trim()),
        company_locations: locations.split(",").map(l => l.trim()),
        job_keywords: jobKeywords.split(",").map(k => k.trim()),
        result_limit: resultLimit
      };

      const { data, error } = await supabase.functions.invoke("create-list-building-job", {
        body: { airtable_client_id: selectedClient, config }
      });

      if (error) throw error;

      toast.success("List building job started!");
      
      // Trigger execution
      await supabase.functions.invoke("execute-list-building", {
        body: { jobId: data.job_id }
      });

      loadJobs();
    } catch (error: any) {
      console.error("Error starting job:", error);
      toast.error("Failed to start job: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Completed</Badge>;
      case 'failed': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>;
      case 'pending': return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Pending</Badge>;
      default: return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 animate-pulse">{status.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#222121]">
              <span className="size-2 rounded-full bg-[#222121]" />
              Lead generation
            </div>
            <h1 className="text-3xl font-semibold text-[#222121]">
              <span className="text-[#222121]/40">Build targeted</span>{" "}
              <span className="text-[#222121]">lead lists.</span>
            </h1>
            <p className="text-sm text-[#222121]/60">
              Automated lead generation using Apollo & BetterContact.
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Configuration Card */}
          <Card hover="none" className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[#222121]">
                <div className="flex size-8 items-center justify-center rounded-full bg-[#222121]/10">
                  <Search className="h-4 w-4 text-[#222121]" />
                </div>
                New List Building Job
              </CardTitle>
              <CardDescription className="text-[#222121]/50">Configure your search criteria and hiring signals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Select Client</Label>
                <Select onValueChange={setSelectedClient} value={selectedClient}>
                  <SelectTrigger className="border-[#222121]/10">
                    <SelectValue placeholder="Select a client from Airtable" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Target Job Titles</Label>
                  <Input
                    value={targetTitles}
                    onChange={(e) => setTargetTitles(e.target.value)}
                    placeholder="HR Director, Hiring Manager"
                    className="border-[#222121]/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Company Size Ranges</Label>
                  <Input
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    placeholder="50,200"
                    className="border-[#222121]/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Locations</Label>
                  <Input
                    value={locations}
                    onChange={(e) => setLocations(e.target.value)}
                    placeholder="United States, UK"
                    className="border-[#222121]/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Hiring Keywords</Label>
                  <Input
                    value={jobKeywords}
                    onChange={(e) => setJobKeywords(e.target.value)}
                    placeholder="Sales, Tech"
                    className="border-[#222121]/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Result Limit</Label>
                <Input
                  type="number"
                  value={resultLimit}
                  onChange={(e) => setResultLimit(parseInt(e.target.value))}
                  className="border-[#222121]/10"
                />
              </div>

              <Button
                className="w-full rounded-full bg-[#222121] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(34,33,33,0.25)] transition-all hover:bg-[#333] hover:shadow-[0_8px_24px_rgba(34,33,33,0.35)]"
                onClick={handleStartJob}
                disabled={isCreating}
              >
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Start List Building
              </Button>
            </CardContent>
          </Card>

          {/* Recent Jobs Card */}
          <Card hover="none" className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[#222121]">
                <div className="flex size-8 items-center justify-center rounded-full bg-[#222121]/10">
                  <Clock className="h-4 w-4 text-[#222121]" />
                </div>
                Recent Jobs
              </CardTitle>
              <CardDescription className="text-[#222121]/50">Monitor progress and download results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.length === 0 ? (
                  <p className="text-center text-[#222121]/50 py-8">No jobs found.</p>
                ) : (
                  jobs.slice(0, 5).map(job => (
                    <div key={job.id} className="space-y-2 border-b border-[#222121]/5 pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-[#222121]">{clients.find(c => c.id === job.airtable_client_id)?.name || 'Unknown Client'}</p>
                          <p className="text-xs text-[#222121]/50">{new Date(job.created_at).toLocaleString()}</p>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>

                      {job.status !== 'completed' && job.status !== 'failed' && job.progress && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-[#222121]/50">
                            <span>{job.progress.message}</span>
                            <span>{Math.round((job.progress.step / 4) * 100)}%</span>
                          </div>
                          <Progress value={(job.progress.step / 4) * 100} className="h-1" />
                        </div>
                      )}

                      {job.status === 'completed' && (
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-sm text-emerald-600 font-medium">{job.result_count} leads found</span>
                          <Button variant="outline" size="sm" className="h-8 rounded-full border-[#222121]/10 text-xs">
                            <Download className="mr-2 h-3 w-3" />
                            Export CSV
                          </Button>
                        </div>
                      )}

                      {job.status === 'failed' && (
                        <p className="text-xs text-red-500 mt-1">{job.error}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full Jobs Table */}
        <Card hover="none" className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-[#222121]">All List Building Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-[#222121]/5">
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Date</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Client</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Criteria</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Status</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Results</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-[#222121]/50 py-8">
                      No jobs found. Create your first list building job above.
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map(job => (
                    <TableRow key={job.id} className="border-[#222121]/5">
                      <TableCell className="text-sm text-[#222121]/70">{new Date(job.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium text-[#222121]">
                        {clients.find(c => c.id === job.airtable_client_id)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm text-[#222121]/70 max-w-[200px] truncate">
                        {job.config?.target_titles?.join(", ") || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="font-medium text-[#222121]">{job.result_count}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" disabled={job.status !== 'completed'} className="h-8 w-8 p-0">
                          <Download className="h-4 w-4" />
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
    </AdminLayout>
  );
};

export default AdminListBuilder;
