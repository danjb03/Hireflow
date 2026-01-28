import { MapPin, Building2, Users, Briefcase } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

interface MarketplaceLeadCardProps {
  lead: MarketplaceLead;
  onExpressInterest: (lead: MarketplaceLead) => void;
}

const MarketplaceLeadCard = ({ lead, onExpressInterest }: MarketplaceLeadCardProps) => {
  const formatIndustry = () => {
    if (lead.industry && lead.industry2) {
      return `${lead.industry} / ${lead.industry2}`;
    }
    return lead.industry || "Various Industries";
  };

  const formatLocation = () => {
    if (lead.region && lead.country) {
      return `${lead.region}, ${lead.country}`;
    }
    return lead.region || lead.country || "UK";
  };

  return (
    <Card className="group flex flex-col overflow-hidden border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:border-[#34B192]/30 hover:shadow-lg">
      <CardContent className="flex-1 p-6">
        {/* Industry badge */}
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#34B192]/10 px-3 py-1 text-xs font-medium text-[#34B192]">
          <Building2 className="h-3 w-3" />
          {formatIndustry()}
        </div>

        {/* Title */}
        <h3 className="mb-3 text-lg font-semibold text-[#222121]">
          {lead.displayName}
        </h3>

        {/* Write-up or default description */}
        <p className="mb-4 text-sm leading-relaxed text-[#222121]/70">
          {lead.marketplaceWriteup ||
            "A growing company in this sector is actively hiring and looking for recruitment support."}
        </p>

        {/* Meta information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-[#222121]/60">
            <MapPin className="h-4 w-4 text-[#34B192]" />
            <span>{formatLocation()}</span>
          </div>

          {lead.companySize && (
            <div className="flex items-center gap-2 text-sm text-[#222121]/60">
              <Users className="h-4 w-4 text-[#34B192]" />
              <span>{lead.companySize} employees</span>
            </div>
          )}

          {lead.titlesOfRoles && (
            <div className="flex items-center gap-2 text-sm text-[#222121]/60">
              <Briefcase className="h-4 w-4 text-[#34B192]" />
              <span className="line-clamp-1">{lead.titlesOfRoles}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="border-t border-[#222121]/5 bg-[#F7F7F7]/50 p-4">
        <Button
          onClick={() => onExpressInterest(lead)}
          className="w-full rounded-full bg-[#34B192] text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E] hover:shadow-[0_6px_16px_rgba(52,177,146,0.35)]"
        >
          Register Interest
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MarketplaceLeadCard;
