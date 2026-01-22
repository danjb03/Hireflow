import { Brain, TrendingDown, Zap } from "lucide-react";

const benefits = [
  {
    icon: Brain,
    title: "AI-powered personalization",
    description:
      "Every email is tailored to your ideal client, driving responses and booked calls.",
  },
  {
    icon: TrendingDown,
    title: "Cost-effective scaling",
    description:
      "Replace in-house BD overhead with a dedicated outreach engine that scales with you.",
  },
  {
    icon: Zap,
    title: "Fast, focused setup",
    description:
      "Launch in 7-14 days with clear positioning, approved lists, and reporting baked in.",
  },
];

export const WhyChooseSection = () => {
  return (
    <section className="relative overflow-hidden bg-[#F7F7F7] py-20 md:py-28">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(52,177,146,0.06),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(52,177,146,0.04),transparent_65%),radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_70%)]" />
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
              <span className="size-2 rounded-full bg-[#34B192]" />
              Why Hireflow
            </div>
            <h2 className="mt-6 text-4xl font-semibold text-[#222121] md:text-5xl">
              <span className="text-[#222121]/40">Partner with a team that</span>{" "}
              <span className="text-[#222121]">delivers results.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-base text-[#222121]/70">
              Hireflow combines AI-driven outbound with strategic calling to bring qualified recruitment clients straight into your pipeline.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-2xl border border-[#222121]/[0.08] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-[#34B192]/10">
                  <benefit.icon className="size-5 text-[#34B192]" />
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-[#222121]">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-sm text-[#222121]/60">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
