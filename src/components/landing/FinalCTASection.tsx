import { Button } from "@/components/ui/button";

export const FinalCTASection = () => {
  return (
    <section className="py-24 bg-gradient-to-r from-[#64df88] to-[#35b192] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAgNHYyaDJ2LTJoLTJ6bS0yIDJ2Mmgydi0yaC0yem0wLTR2Mmgydi0yaC0yem0yLTJ2LTJoLTJ2Mmgyem0wLTRoMnYyaC0ydi0yem0yIDJ2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0yLTJ2LTJoLTJ2Mmgyem0wLTRoMnYyaC0ydi0yem0yIDJ2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0yLTJ2LTJoLTJ2Mmgyem0wLTRoMnYyaC0ydi0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-10" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Headline */}
          <h2 className="text-3xl md:text-5xl font-bold text-white">
            Ready to Fill Your Pipeline?
          </h2>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/90">
            Book a call with our team today. Let's discuss how we can help you scale.
          </p>

          {/* CTA Button */}
          <div className="pt-4">
            <a href="https://calendly.com/billy-tnwmarketing/rec-opportunities" target="_blank" rel="noopener noreferrer">
              <Button 
                size="lg" 
                className="bg-white text-[#35b192] hover:bg-white/90 font-semibold px-8 py-6 text-lg rounded-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105"
              >
                Book Your Strategy Call Now
              </Button>
            </a>
            <p className="text-white/80 text-sm mt-4">
              No commitment required • 30-minute call • See if we're a fit
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};