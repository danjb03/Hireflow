import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Sparkles, Store } from "lucide-react";

import hireflowLightLogo from "@/assets/hireflow-light.svg";
import hireflowWhiteLogo from "@/assets/hireflowwhite.png";

const highlights = [
  "7-14 day launch",
  "Performance-based model",
  "Results guarantee",
];

const stats = [
  { value: "3000+", label: "Leads generated" },
  { value: "100s", label: "Terms signed" },
  { value: "24hr", label: "Avg response time" },
];

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-[#F7F7F7]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(52,177,146,0.12),transparent_60%)]" />

      <header className="relative z-10">
        <div className="container mx-auto px-4 pt-8">
          <div className="flex items-center justify-between rounded-full border border-[#222121]/[0.08] bg-white px-5 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <Link to="/" className="flex items-center">
              <img src={hireflowLightLogo} alt="Hireflow" className="h-8" />
            </Link>
            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="ghost"
                className="h-11 rounded-full bg-violet-100 px-5 text-sm font-semibold text-violet-700 transition-all hover:bg-violet-200"
              >
                <Link to="/marketplace" className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Marketplace
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full border-[#222121]/10 bg-white px-6 text-sm font-semibold text-[#222121] transition-all hover:border-[#222121]/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <Link to="/login">Login</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-11 rounded-full bg-[#34B192] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E] hover:shadow-[0_8px_24px_rgba(52,177,146,0.35)]"
              >
                <a
                  href="https://calendly.com/jordan-m-hireflow/30min?back=1&month=2026-01"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Book a call
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        <div className="container mx-auto px-4 pb-20 pt-16 md:pt-20">
          <div className="mx-auto max-w-4xl space-y-10 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
                <span className="size-2 rounded-full bg-[#34B192]" />
                Trusted by recruitment teams across the UK
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2">
                <span className="size-2 rounded-full bg-[#34B192] animate-pulse" />
                <span className="text-sm font-medium text-[#34B192]">3 slots left</span>
                <span className="text-sm text-[#222121]/60">Launch in 2-3 weeks</span>
              </div>
            </div>

            <div className="space-y-5">
              <h1 className="text-5xl font-semibold text-[#222121] md:text-6xl">
                <span className="text-[#222121]">Scale</span>{" "}
                <span className="text-[#222121]">your</span>{" "}
                <span className="text-[#222121]">recruitment</span>{" "}
                <span className="text-[#222121]">Pipeline</span>{" "}
                <span className="text-[#222121]">with</span>{" "}
                <span className="text-[#222121]">Qualified Calls</span>
              </h1>
              <p className="text-base text-[#222121]/70 md:text-lg">
                We deliver consistent, qualified client meetings through AI-led outreach and strategic calling. Focus on placements while we grow your pipeline.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-4">
              <a
                href="https://calendly.com/jordan-m-hireflow/30min?back=1&month=2026-01"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-3 rounded-2xl bg-[#34B192] px-6 py-4 text-left text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:scale-[1.02] hover:bg-[#2D9A7E] hover:shadow-[0_8px_24px_rgba(52,177,146,0.35)]"
              >
                <div className="size-12 overflow-hidden rounded-xl border-2 border-white/20 bg-white">
                  <img
                    src={hireflowWhiteLogo}
                    alt="Hireflow"
                    className="size-full object-contain p-0.5"
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold">Book an intro call</div>
                  <div className="text-sm text-white/80">
                    Let's talk about your pipeline
                  </div>
                </div>
                <ArrowRight className="ml-2 size-4 text-white/90" />
              </a>
              <p className="flex items-center gap-2 text-sm text-[#222121]/50">
                <span className="size-1.5 rounded-full bg-[#34B192] animate-pulse" />
                Be quick! Spots are almost gone for {new Date().toLocaleString('default', { month: 'long' })}.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-3 py-2 text-sm text-[#222121]/70"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-[#34B192]/10">
                    <CheckCircle2 className="size-4 text-[#34B192]" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16">
            <div className="mx-auto max-w-4xl rounded-2xl border-y border-[#222121]/[0.08] bg-white px-6 py-10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="grid gap-8 md:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-4xl font-semibold text-[#222121]">
                      {stat.value}
                    </div>
                    <div className="mt-2 text-sm text-[#222121]/50">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trusted By Section */}
          <div className="mt-16">
            <p className="text-center text-sm font-medium text-[#222121]/40 uppercase tracking-wider mb-8">
              Trusted by leading recruitment companies
            </p>
            <div className="relative overflow-hidden">
              <div className="flex animate-scroll">
                {[...Array(2)].map((_, setIndex) => (
                  <div key={setIndex} className="flex shrink-0 items-center gap-16 px-8">
                    <img src="/logos/hyrra.svg" alt="Hyrra" className="h-8 w-auto opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all" />
                    <img src="/logos/squarelogik.svg" alt="Squarelogik" className="h-8 w-auto opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all" />
                    <img src="/logos/octogle.svg" alt="Octogle" className="h-8 w-auto opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all" />
                    <img src="/logos/recruitment-revenue.svg" alt="Recruitment Revenue" className="h-8 w-auto opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
