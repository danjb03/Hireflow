import { useState, useEffect } from "react";
import { Loader2, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import MarketplaceHero from "@/components/marketplace/MarketplaceHero";
import MarketplaceLeadCard from "@/components/marketplace/MarketplaceLeadCard";
import InterestForm from "@/components/marketplace/InterestForm";

interface MarketplaceLead {
  id: string;
  displayName: string;
  industry: string | null;
  industry2: string | null;
  region: string | null;
  country: string | null;
  companySize: string | null;
  titlesOfRoles: string | null;
  marketplaceWriteup: string | null;
  dateCreated: string;
}

const Marketplace = () => {
  const [leads, setLeads] = useState<MarketplaceLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [selectedLead, setSelectedLead] = useState<MarketplaceLead | null>(null);
  const [interestFormOpen, setInterestFormOpen] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-marketplace-leads`,
        {
          method: "GET",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setLeads(result.leads || []);
    } catch (error: any) {
      console.error("Error loading marketplace leads:", error);
      toast({
        title: "Error",
        description: "Failed to load marketplace leads. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExpressInterest = (lead: MarketplaceLead) => {
    setSelectedLead(lead);
    setInterestFormOpen(true);
  };

  // Get unique industries for filter
  const industries = Array.from(
    new Set(
      leads
        .map((lead) => lead.industry)
        .filter((industry): industry is string => Boolean(industry))
    )
  ).sort();

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    // Industry filter
    if (industryFilter && lead.industry !== industryFilter) {
      return false;
    }

    // Search filter (searches across multiple fields)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesIndustry = lead.industry?.toLowerCase().includes(search);
      const matchesIndustry2 = lead.industry2?.toLowerCase().includes(search);
      const matchesRegion = lead.region?.toLowerCase().includes(search);
      const matchesCountry = lead.country?.toLowerCase().includes(search);
      const matchesRoles = lead.titlesOfRoles?.toLowerCase().includes(search);
      const matchesWriteup = lead.marketplaceWriteup?.toLowerCase().includes(search);

      if (
        !matchesIndustry &&
        !matchesIndustry2 &&
        !matchesRegion &&
        !matchesCountry &&
        !matchesRoles &&
        !matchesWriteup
      ) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[#222121]/10 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="text-xl font-bold text-violet-600">
            Hireflow
          </a>
          <div className="flex items-center gap-4">
            <a
              href="/login"
              className="text-sm font-medium text-[#222121]/60 transition-colors hover:text-[#222121]"
            >
              Sign In
            </a>
            <a
              href="/login"
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-violet-700"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero section */}
        <MarketplaceHero />

        {/* Filters */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#222121]/40" />
            <Input
              placeholder="Search by industry, location, roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 rounded-full border-[#222121]/10 bg-white pl-10 text-sm"
            />
          </div>

          <Select value={industryFilter || "all"} onValueChange={(v) => setIndustryFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-11 w-full rounded-full border-[#222121]/10 bg-white text-sm sm:w-48">
              <Filter className="mr-2 h-4 w-4 text-[#222121]/40" />
              <SelectValue placeholder="All Industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="mt-6 text-sm text-[#222121]/60">
          {loading ? (
            "Loading opportunities..."
          ) : (
            <>
              Showing {filteredLeads.length} hiring{" "}
              {filteredLeads.length === 1 ? "opportunity" : "opportunities"}
              {searchTerm || industryFilter
                ? ` (${leads.length} total)`
                : ""}
            </>
          )}
        </div>

        {/* Leads grid */}
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <div className="mb-4 h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center">
              <Search className="h-8 w-8 text-violet-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[#222121]">
              No opportunities found
            </h3>
            <p className="text-sm text-[#222121]/60">
              {leads.length === 0
                ? "Check back soon for new hiring opportunities."
                : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLeads.map((lead) => (
              <MarketplaceLeadCard
                key={lead.id}
                lead={lead}
                onExpressInterest={handleExpressInterest}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-[#222121]/10 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-[#222121]/60 sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} Hireflow. All rights reserved.</p>
        </div>
      </footer>

      {/* Interest form modal */}
      <InterestForm
        lead={selectedLead}
        open={interestFormOpen}
        onOpenChange={setInterestFormOpen}
      />
    </div>
  );
};

export default Marketplace;
