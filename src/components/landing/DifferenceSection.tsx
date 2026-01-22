import { Award, Eye, LineChart, Target } from "lucide-react";

const features = [
  {
    icon: Award,
    title: "Performance-based model",
    description:
      "We only keep clients when we deliver qualified leads that turn into meetings and placements.",
  },
  {
    icon: Target,
    title: "Recruitment industry specialists",
    description:
      "Messaging and targeting built for recruiters, refined by the nuances of your market.",
  },
  {
    icon: LineChart,
    title: "Multi-channel outreach",
    description:
      "AI-powered email plus strategic calling for reach, consistency, and response volume.",
  },
  {
    icon: Eye,
    title: "Transparent reporting",
    description:
      "Real-time dashboards and weekly updates so you always know campaign impact.",
  },
];

export const DifferenceSection = () => {
  return (
    <section className="bg-[#F7F7F7] py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
                <span className="size-2 rounded-full bg-[#34B192]" />
                The difference
              </div>
              <h2 className="mt-6 text-4xl font-semibold text-[#222121] md:text-5xl">
                <span className="text-[#222121]/40">Built for outcomes.</span>{" "}
                <span className="text-[#222121]">Powered by clarity.</span>
              </h2>
              <p className="mt-5 text-base text-[#222121]/70">
                Most lead gen agencies take retainers regardless of results. Our model is built around clear outcomes, tight feedback loops, and transparent reporting.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-[#222121]/[0.08] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                    <feature.icon className="size-5 text-[#34B192]" />
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold text-[#222121]">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm text-[#222121]/60">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
