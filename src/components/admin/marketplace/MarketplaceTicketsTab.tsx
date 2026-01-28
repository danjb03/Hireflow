import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Mail, Phone, Building2, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface MarketplaceTicket {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string;
  message: string | null;
  leadId: string;
  leadSummary: string | null;
  status: string;
  closeOpportunityId: string | null;
  createdAt: string;
  updatedAt: string;
  contactedAt: string | null;
  adminNotes: string | null;
}

interface MarketplaceTicketsTabProps {
  tickets: MarketplaceTicket[];
  loading: boolean;
  onRefresh: () => void;
}

const TICKET_STATUSES = ["new", "contacted", "qualified", "closed"];

const MarketplaceTicketsTab = ({ tickets, loading, onRefresh }: MarketplaceTicketsTabProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<MarketplaceTicket | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    setUpdatingStatus(ticketId);

    try {
      const { data, error } = await supabase.functions.invoke("update-marketplace-ticket", {
        body: { ticketId, status: newStatus },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Status Updated",
        description: `Ticket status changed to ${newStatus}`,
      });

      onRefresh();
    } catch (error: any) {
      console.error("Error updating ticket status:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedTicket) return;

    setSavingNotes(true);

    try {
      const { data, error } = await supabase.functions.invoke("update-marketplace-ticket", {
        body: { ticketId: selectedTicket.id, adminNotes },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Notes Saved",
        description: "Admin notes have been updated",
      });

      onRefresh();
    } catch (error: any) {
      console.error("Error saving notes:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save notes",
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleViewTicket = (ticket: MarketplaceTicket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.adminNotes || "");
    setDetailDialogOpen(true);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-700";
      case "contacted":
        return "bg-amber-100 text-amber-700";
      case "qualified":
        return "bg-emerald-100 text-emerald-700";
      case "closed":
        return "bg-slate-100 text-slate-600";
      default:
        return "bg-slate-100 text-slate-500";
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (statusFilter && ticket.status !== statusFilter) {
      return false;
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesName = ticket.contactName?.toLowerCase().includes(search);
      const matchesEmail = ticket.contactEmail?.toLowerCase().includes(search);
      const matchesCompany = ticket.companyName?.toLowerCase().includes(search);
      if (!matchesName && !matchesEmail && !matchesCompany) {
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
            placeholder="Search by name, email, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 rounded-full border-[#222121]/10 bg-white pl-9 text-sm"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-11 w-48 rounded-full border-[#222121]/10 bg-white text-sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            {TICKET_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-[#222121]/60">
        {filteredTickets.length} tickets{" "}
        {tickets.length !== filteredTickets.length && `(${tickets.length} total)`}
      </p>

      {/* Table */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-2xl border border-[#222121]/10 bg-white p-8 text-center">
          <p className="text-sm text-[#222121]/60">No interest tickets yet.</p>
          <p className="mt-1 text-xs text-[#222121]/40">
            Tickets will appear here when someone expresses interest in a marketplace lead.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#222121]/10">
                <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                  Contact
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                  Company
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                  Interested In
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                  Status
                </TableHead>
                <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                  Received
                </TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer border-b border-[#222121]/10 transition-colors last:border-0 hover:bg-violet-50/50"
                  onClick={() => handleViewTicket(ticket)}
                >
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#222121]">
                        {ticket.contactName}
                      </span>
                      <span className="text-xs text-[#222121]/50">
                        {ticket.contactEmail}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#222121]">
                    {ticket.companyName}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#222121]/70">
                    <span className="line-clamp-1">
                      {ticket.leadSummary || "Marketplace Lead"}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={ticket.status}
                        onValueChange={(value) => handleStatusChange(ticket.id, value)}
                        disabled={updatingStatus === ticket.id}
                      >
                        <SelectTrigger
                          className={`h-8 w-28 rounded-full border-0 text-xs ${getStatusBadgeColor(
                            ticket.status
                          )}`}
                        >
                          {updatingStatus === ticket.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {TICKET_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-[#222121]/60">
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewTicket(ticket);
                      }}
                      className="h-8 w-8 rounded-full p-0 hover:bg-violet-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Interest Ticket</DialogTitle>
            <DialogDescription>
              {selectedTicket?.leadSummary || "Marketplace Lead Interest"}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6 pt-4">
              {/* Contact Info */}
              <div className="space-y-3 rounded-xl bg-[#F7F7F7] p-4">
                <h4 className="text-sm font-semibold text-[#222121]">Contact Information</h4>
                <div className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-violet-500" />
                    <div>
                      <p className="text-sm font-medium text-[#222121]">
                        {selectedTicket.contactName}
                      </p>
                      <p className="text-xs text-[#222121]/60">
                        {selectedTicket.companyName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-violet-500" />
                    <a
                      href={`mailto:${selectedTicket.contactEmail}`}
                      className="text-sm text-violet-600 hover:underline"
                    >
                      {selectedTicket.contactEmail}
                    </a>
                  </div>
                  {selectedTicket.contactPhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-violet-500" />
                      <a
                        href={`tel:${selectedTicket.contactPhone}`}
                        className="text-sm text-violet-600 hover:underline"
                      >
                        {selectedTicket.contactPhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Message */}
              {selectedTicket.message && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#222121]">Message</Label>
                  <p className="rounded-xl bg-[#F7F7F7] p-4 text-sm text-[#222121]/80">
                    {selectedTicket.message}
                  </p>
                </div>
              )}

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="adminNotes" className="text-sm font-semibold text-[#222121]">
                  Admin Notes
                </Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this ticket..."
                  rows={3}
                  className="resize-none rounded-xl border-[#222121]/15"
                />
                <Button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  size="sm"
                  className="rounded-full bg-violet-600 text-white hover:bg-violet-700"
                >
                  {savingNotes ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Notes"
                  )}
                </Button>
              </div>

              {/* Close.com Link */}
              {selectedTicket.closeOpportunityId && (
                <div className="pt-2">
                  <a
                    href={`https://app.close.com/opportunity/${selectedTicket.closeOpportunityId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-violet-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View in Close.com
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketplaceTicketsTab;
