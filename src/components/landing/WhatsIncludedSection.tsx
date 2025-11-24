import { CheckCircle2 } from "lucide-react";

export const WhatsIncludedSection = () => {
  const features = [
    "Ideal Client Profile (ICP) Research",
    "AI-Powered Email Personalization",
    "Multi-Touch Campaign Sequences",
    "Professional Cold Calling",
    "CRM Integration & Lead Tracking",
    "Dedicated Account Manager",
    "Weekly Performance Reports",
    "A/B Testing & Optimization",
    "Lead Quality Guarantee",
    "Compliance & GDPR Management",
    "Real-Time Dashboard Access",
    "Ongoing Campaign Refinement",
    "Appointment Setting & Qualification",
    "Industry-Specific Messaging",
    "Competitor Analysis",
    "Response Handling & Follow-Up",
    "Performance-Based Pricing"
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What's All Included
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to scale your recruitment agency's client acquisition
            </p>
          </div>

          {/* Features List */}
          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                <CheckCircle2 className="h-6 w-6 text-[#64df88] flex-shrink-0 mt-0.5" />
                <span className="text-foreground font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};