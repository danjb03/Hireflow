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
      case 'completed': return <Badge className="bg-green-500">Completed</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      default: return <Badge className="bg-blue-500 animate-pulse">{status.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">List Builder</h1>
            <p className="text-muted-foreground">Automated lead generation using Apollo & BetterContact</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                New List Building Job
              </CardTitle>
              <CardDescription>Configure your search criteria and hiring signals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Client</Label>
                <Select onValueChange={setSelectedClient} value={selectedClient}>
                  <SelectTrigger>
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
                  <Label>Target Job Titles</Label>
                  <Input 
                    value={targetTitles} 
                    onChange={(e) => setTargetTitles(e.target.value)}
                    placeholder="HR Director, Hiring Manager"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Size Ranges</Label>
                  <Input 
                    value={companySize} 
                    onChange={(e) => setCompanySize(e.target.value)}
                    placeholder="50,200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Locations</Label>
                  <Input 
                    value={locations} 
                    onChange={(e) => setLocations(e.target.value)}
                    placeholder="United States, UK"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hiring Keywords</Label>
                  <Input 
                    value={jobKeywords} 
                    onChange={(e) => setJobKeywords(e.target.value)}
                    placeholder="Sales, Tech"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Result Limit</Label>
                <Input 
                  type="number" 
                  value={resultLimit} 
                  onChange={(e) => setResultLimit(parseInt(e.target.value))}
                />
              </div>

              <Button 
                className="w-full bg-[#34B192] hover:bg-[#2D9A7E]" 
                onClick={handleStartJob}
                disabled={isCreating}
              >
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Start List Building
              </Button>
            </CardContent>
          </Card>

          {/* Recent Jobs Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Jobs
              </CardTitle>
              <CardDescription>Monitor progress and download results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {jobs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No jobs found.</p>
                ) : (
                  jobs.slice(0, 5).map(job => (
                    <div key={job.id} className="space-y-2 border-b pb-4 last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{clients.find(c => c.id === job.airtable_client_id)?.name || 'Unknown Client'}</p>
                          <p className="text-xs text-muted-foreground">{new Date(job.created_at).toLocaleString()}</p>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>
                      
                      {job.status !== 'completed' && job.status !== 'failed' && job.progress && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{job.progress.message}</span>
                            <span>{Math.round((job.progress.step / 4) * 100)}%</span>
                          </div>
                          <Progress value={(job.progress.step / 4) * 100} className="h-1" />
                        </div>
                      )}

                      {job.status === 'completed' && (
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-sm text-green-600 font-medium">{job.result_count} leads found</span>
                          <Button variant="outline" size="sm" className="h-8">
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
        <Card>
          <CardHeader>
            <CardTitle>All List Building Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Criteria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="text-xs">{new Date(job.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">
                      {clients.find(c => c.id === job.airtable_client_id)?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {job.config.target_titles.join(", ")}
                    </TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>{job.result_count}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" disabled={job.status !== 'completed'}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminListBuilder;
