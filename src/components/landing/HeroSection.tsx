import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import hireflowLogo from "@/assets/hireflow-logo.svg";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

      {/* Animated mesh gradient overlay */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-emerald-500/20 rounded-full blur-[128px] animate-pulse delay-1000" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-slate-600/20 rounded-full blur-[128px] animate-pulse delay-500" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full">
        <div className="mx-4 mt-4">
          <div className="max-w-7xl mx-auto px-6 py-4 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_-8px_rgb(0_0_0/0.3)]">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center group">
                <img src={hireflowLogo} alt="Hireflow" className="h-8 md:h-10 transition-transform group-hover:scale-105" />
              </Link>
              <Link to="/login">
                <Button
                  variant="glass"
                  className="text-white border-white/20 hover:bg-white/20"
                >
                  Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-20 relative z-10 flex-1 flex items-center">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Announcement badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 text-white/80 text-sm mb-8">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Trusted by the UK's fastest-growing recruitment agencies</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight">
            We Generate Your Recruitment Agency{" "}
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              Unlimited Qualified Leads
            </span>{" "}
            Through Direct Marketing
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
            We'll handle targeting, messaging, and outreach, so you don't have to juggle dozens of shaky lead sources to get scalable, consistent AND qualified client flow
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 py-8">
            {[
              "7-14 Day Launch",
              "Performance-Based Model",
              "Results Guarantee"
            ].map((text, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
              >
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
                <span className="font-medium text-white">{text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="pt-6 space-y-4">
            <a href="https://calendly.com/billy-tnwmarketing/rec-opportunities" target="_blank" rel="noopener noreferrer">
              <Button
                size="xl"
                variant="gradient"
                className="group"
              >
                Book Your Strategy Call
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </a>
            <p className="text-white/50 text-sm">
              No commitment required &bull; 30-minute call
            </p>
          </div>

          {/* Stats row */}
          <div className="pt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {[
              { value: "500+", label: "Leads Generated" },
              { value: "98%", label: "Client Satisfaction" },
              { value: "14", label: "Day Average Launch" }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-white/50 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
};
