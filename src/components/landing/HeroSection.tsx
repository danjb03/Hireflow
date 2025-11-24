import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import hireflowLogo from "@/assets/hireflow-logo.svg";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a] overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#64df88]/5 to-[#35b192]/5 pointer-events-none" />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center mb-12">
            <img src={hireflowLogo} alt="Hireflow" className="h-12 md:h-16" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            We Generate Your Recruitment Agency Unlimited Qualified Leads Through Direct Marketing
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            We'll handle targeting, messaging, and outreach, so that you don't have to juggle dozens of shaky lead sources to get scalable, consistent AND qualified client flow
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 py-8">
            <div className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-[#64df88]" />
              <span className="font-medium">7-14 Day Launch</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-[#64df88]" />
              <span className="font-medium">Performance-Based Model</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <CheckCircle2 className="h-5 w-5 text-[#64df88]" />
              <span className="font-medium">Results Guarantee</span>
            </div>
          </div>

          <p className="text-white/60 text-sm">
            Trusted by the UK's fastest-growing recruitment agencies
          </p>

          {/* CTA */}
          <div className="pt-6">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-[#64df88] to-[#35b192] hover:opacity-90 text-white font-semibold px-8 py-6 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              Book Your Strategy Call
            </Button>
            <p className="text-white/50 text-sm mt-4">
              No commitment required • 30-minute call
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};