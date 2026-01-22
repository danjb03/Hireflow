import { Briefcase, Phone, Rocket, Settings } from "lucide-react";

const steps = [
  {
    icon: Phone,
    number: "1-2 days",
    title: "Discovery call",
    description:
      "We align on your ideal client profile, sectors, and what success looks like.",
  },
  {
    icon: Settings,
    number: "7-14 days",
    title: "Campaign setup",
    description:
      "Target lists, messaging, and infrastructure are built and approved for launch.",
  },
  {
    icon: Rocket,
    number: "Week 3",
    title: "Launch and optimize",
    description:
      "Campaigns go live with daily monitoring, testing, and iteration for response lift.",
  },
  {
    icon: Briefcase,
    number: "Ongoing",
    title: "Qualified leads delivered",
    description:
      "You receive booked meetings while we keep refining output and reporting.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-[#F7F7F7] py-20 md:py-28"
    >
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_bottom_right,rgba(52,177,146,0.06),transparent_60%),radial-gradient(circle_at_top_left,rgba(52,177,146,0.04),transparent_65%),radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_70%)]" />
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
              <span className="size-2 rounded-full bg-[#34B192]" />
              How it works
            </div>
            <h2 className="mt-6 text-4xl font-semibold text-[#222121] md:text-5xl">
              <span className="text-[#222121]/40">A process that keeps your</span>{" "}
              <span className="text-[#222121]">pipeline moving.</span>
            </h2>
            <p className="mt-5 text-base text-[#222121]/70">
              From first call to qualified meetings, we prioritize speed, clarity, and measurable impact.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-[#222121]/[0.08] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
              >
                <span className="text-xs font-semibold text-[#34B192]">
                  {step.number}
                </span>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                    <step.icon className="size-5 text-[#34B192]" />
                  </div>
                  <div className="text-5xl font-semibold text-[#34B192]/20">
                    {index + 1}.
                  </div>
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-[#222121]">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm text-[#222121]/60">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
