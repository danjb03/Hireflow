import { Mail, Phone } from "lucide-react";

import hireflowLightLogo from "@/assets/hireflow-light.svg";

export const Footer = () => {
  return (
    <footer className="relative overflow-hidden bg-[#F7F7F7]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(52,177,146,0.18),transparent_60%)]" />
      <div className="absolute inset-x-0 -bottom-32 flex items-end justify-center pointer-events-none select-none md:-bottom-40">
        <span className="text-[36vw] font-semibold text-[#222121]/[0.03] leading-none tracking-tight md:text-[26vw]">
          hireflow
        </span>
      </div>
      <div className="container relative mx-auto px-4 pb-32 pt-16 md:pb-40">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <img src={hireflowLightLogo} alt="Hireflow" className="h-8" />
            <p className="text-sm text-[#222121]/60">
              AI-powered lead generation for recruitment agencies. Scale client
              acquisition with consistent, qualified outreach.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#222121]">Company</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#222121]/60">
              <li>
                <a href="#" className="transition-colors hover:text-[#34B192]">
                  About Us
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="transition-colors hover:text-[#34B192]">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-[#34B192]">
                  Case Studies
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-[#34B192]">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#222121]">Get in touch</h3>
            <ul className="mt-3 space-y-3 text-sm text-[#222121]/60">
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-[#34B192]" />
                <a
                  href="mailto:hello@hireflow.com"
                  className="transition-colors hover:text-[#34B192]"
                >
                  hello@hireflow.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-[#34B192]" />
                <a
                  href="tel:+447458940248"
                  className="transition-colors hover:text-[#34B192]"
                >
                  +44 7458 940248
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#222121]/10 pt-6 text-xs text-[#222121]/50 md:flex-row">
          <p>© {new Date().getFullYear()} Hireflow. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-[#34B192]">
              Privacy Policy
            </a>
            <a href="#" className="transition-colors hover:text-[#34B192]">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
