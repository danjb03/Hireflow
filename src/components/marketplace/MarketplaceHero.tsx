import { Store } from "lucide-react";

const MarketplaceHero = () => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 px-8 py-12 text-white">
      <div className="relative z-10 max-w-2xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium">
          <Store className="h-4 w-4" />
          Lead Marketplace
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          Premium Hiring Opportunities
        </h1>
        <p className="text-lg text-white/80">
          Browse pre-qualified leads from companies actively looking to hire.
          Express your interest and our team will connect you with the opportunity.
        </p>
      </div>
      {/* Background decorative elements */}
      <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5" />
      <div className="absolute -bottom-20 -right-10 h-60 w-60 rounded-full bg-white/5" />
    </div>
  );
};

export default MarketplaceHero;
