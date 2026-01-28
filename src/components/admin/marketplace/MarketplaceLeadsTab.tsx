import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Loader2, Sparkles, Eye, EyeOff, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AdminMarketplaceLead {
  id: string;
  companyName: string;
  status: string;
  marketplaceStatus: string | null;
  marketplaceWriteup: string | null;
  clients: string;
  contactName: string | null;
  email: string;
  industry: string | null;
  address: string | null;
  country: string | null;
  companySize: string | null;
  titlesOfRoles: string | null;
  dateCreated: string;
}

interface MarketplaceLeadsTabProps {
  leads: AdminMarketplaceLead[];
  loading: boolean;
  onRefresh: () => void;
}

const MARKETPLACE_STATUSES = ["Pending Review", "Active", "Sold", "Hidden"];

const MarketplaceLeadsTab = ({ leads, loading, onRefresh }: MarketplaceLeadsTabProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [generatingWriteup, setGeneratingWriteup] = useState<string | null>(null);
  const [writeupDialogOpen, setWriteupDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<AdminMarketplaceLead | null>(null);
  const [editedWriteup, setEditedWriteup] = useState("");

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setUpdatingStatus(leadId);

    try {
      const { data, error } = await supabase.functions.invoke("update-marketplace-status", {
        body: { leadId, marketplaceStatus: newStatus },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Status Updated",
        description: `Lead marketplace status changed to ${newStatus}`,
      });

      onRefresh();
    } catch (error: any) {
      console.error("Error updating marketplace status:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleGenerateWriteup = async (leadId: string) => {
    setGeneratingWriteup(leadId);

    try {
      const { data, error } = await supabase.functions.invoke("generate-marketplace-writeup", {
        body: { leadId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Write-up Generated",
        description: "AI write-up has been generated and saved",
      });

      onRefresh();
    } catch (error: any) {
      console.error("Error generating writeup:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to generate write-up",
        variant: "destructive",
      });
    } finally {
      setGeneratingWriteup(null);
    }
  };

  const handleViewWriteup = (lead: AdminMarketplaceLead) => {
    setSelectedLead(lead);
    setEditedWriteup(lead.marketplaceWriteup || "");
    setWriteupDialogOpen(true);
  };

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case "Active":
        return "bg-emerald-100 text-emerald-700";
      case "Pending Review":
        return "bg-amber-100 text-amber-700";
      case "Sold":
        return "bg-blue-100 text-blue-700";
      case "Hidden":
        return "bg-slate-100 text-slate-600";
      default:
        return "bg-slate-100 text-slate-500";
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (statusFilter && lead.marketplaceStatus !== statusFilter) {
      return false;
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesCompany = lead.companyName?.toLowerCase().includes(search);
      const matchesIndustry = lead.industry?.toLowerCase().includes(search);
      const matchesContact = lead.contactName?.toLowerCase().includes(search);
      if (!matchesCompany && !matchesIndustry && !matchesContact) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#222121]/40" />
          <Input
            placeholder="Search by company, industry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 rounded-full border-[#222121]/10 bg-white pl-9 text-sm"
          />
        </div>

        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="h-11 w-48 rounded-full border-[#222121]/10 bg-white text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="none">No Status</SelectItem>
            {MARKETPLACE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-[#222121]/60">
        {filteredLeads.length} leads{" "}
        {leads.length !== filteredLeads.length && `(${leads.length} total)`}
      </p>

      {/* Table */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-2xl border border-[#222121]/10 bg-white p-8 text-center">
          <p className="text-sm text-[#222121]/60">
            No marketplace-eligible leads found.
          </p>
          <p className="mt-1 text-xs text-[#222121]/40">
            Leads with status "Rejected" or "Needs Work" will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#222121]/10">
                <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                  Company
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                  Lead Status
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                  Marketplace
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                  Industry
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                  Write-up
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="border-b border-[#222121]/10 transition-colors last:border-0 hover:bg-violet-50/50"
                >
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#222121]">
                        {lead.companyName}
                      </span>
                      {lead.contactName && (
                        <span className="text-xs text-[#222121]/50">
                          {lead.contactName}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        lead.status === "Rejected"
                          ? "bg-red-100 text-red-700"
                          : lead.status === "Needs Work"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Select
                      value={lead.marketplaceStatus || ""}
                      onValueChange={(value) => handleStatusChange(lead.id, value)}
                      disabled={updatingStatus === lead.id}
                    >
                      <SelectTrigger
                        className={`h-8 w-32 rounded-full border-0 text-xs ${getStatusBadgeColor(
                          lead.marketplaceStatus
                        )}`}
                      >
                        {updatingStatus === lead.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <SelectValue placeholder="Set status" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {MARKETPLACE_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status === "Active" && <Eye className="mr-2 inline h-3 w-3" />}
                            {status === "Hidden" && <EyeOff className="mr-2 inline h-3 w-3" />}
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#222121]">
                    {lead.industry || "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {lead.marketplaceWriteup ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewWriteup(lead)}
                        className="h-8 rounded-full text-xs text-violet-600 hover:bg-violet-50"
                      >
                        View
                      </Button>
                    ) : (
                      <span className="text-xs text-[#222121]/40">None</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateWriteup(lead.id)}
                        disabled={generatingWriteup === lead.id}
                        className="h-8 rounded-full text-xs hover:bg-violet-50"
                      >
                        {generatingWriteup === lead.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="mr-1.5 h-3 w-3 text-violet-500" />
                            Generate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`/admin/leads/${lead.id}`, "_blank")}
                        className="h-8 w-8 rounded-full p-0 hover:bg-violet-50"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Write-up Dialog */}
      <Dialog open={writeupDialogOpen} onOpenChange={setWriteupDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Marketplace Write-up</DialogTitle>
            <DialogDescription>
              {selectedLead?.companyName} - {selectedLead?.industry || "Various Industries"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Textarea
              value={editedWriteup}
              onChange={(e) => setEditedWriteup(e.target.value)}
              rows={6}
              className="resize-none rounded-xl border-[#222121]/15"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setWriteupDialogOpen(false)}
                className="rounded-full"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketplaceLeadsTab;
