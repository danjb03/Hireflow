import { Button } from "@/components/ui/button";

import hireflowLightLogo from "@/assets/hireflow-light.svg";
import hireflowWhiteLogo from "@/assets/hireflowwhite.png";

export const FinalCTASection = () => {
  return (
    <section className="relative overflow-hidden bg-[#F7F7F7] py-20 md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(52,177,146,0.12),transparent_65%)]" />
      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
            <span className="size-2 rounded-full bg-[#34B192]" />
            Ready to grow
          </div>
          <h2 className="mt-6 text-4xl font-semibold text-[#222121] md:text-5xl">
            <span className="text-[#222121]/40">Ready to fill your</span>{" "}
            <span className="text-[#222121]">pipeline with qualified leads?</span>
          </h2>
          <p className="mt-5 text-base text-[#222121]/70">
            Book a call and see how Hireflow can deliver recruitment leads in weeks, not months.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4">
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
            </a>
            <p className="flex items-center gap-2 text-sm text-[#222121]/50">
              <span className="size-1.5 rounded-full bg-[#34B192] animate-pulse" />
              Limited availability for {new Date().toLocaleString('default', { month: 'long' })} onboarding.
            </p>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-[#222121]/10 bg-white px-8 text-sm font-semibold text-[#222121] transition-all hover:border-[#222121]/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <a href="mailto:hello@hireflow.com">Reach out via email</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
