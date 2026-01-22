import { CheckCircle2 } from "lucide-react";

const features = [
  "Ideal client profile research",
  "AI-powered email personalization",
  "Multi-touch campaign sequences",
  "Professional cold calling",
  "CRM integration and lead tracking",
  "Dedicated account manager",
  "Weekly performance reporting",
  "A/B testing and optimization",
  "Lead quality guarantee",
  "Compliance and GDPR management",
  "Real-time dashboard access",
  "Ongoing campaign refinement",
  "Appointment setting and qualification",
  "Industry-specific messaging",
  "Competitor analysis",
  "Response handling and follow-up",
  "Performance-based pricing",
];

export const WhatsIncludedSection = () => {
  return (
    <section className="bg-[#F7F7F7] py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
              <span className="size-2 rounded-full bg-[#34B192]" />
              What's included
            </div>
            <h2 className="mt-6 text-4xl font-semibold text-[#222121] md:text-5xl">
              <span className="text-[#222121]/40">Everything needed to</span>{" "}
              <span className="text-[#222121]">scale client acquisition.</span>
            </h2>
            <p className="mt-5 text-base text-[#222121]/70">
              A full outbound system delivered with the structure and reporting recruitment teams expect.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 rounded-2xl border border-[#222121]/[0.08] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <div className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-[#34B192]/10">
                  <CheckCircle2 className="size-4 text-[#34B192]" />
                </div>
                <span className="text-sm text-[#222121]/70">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
