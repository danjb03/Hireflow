import { Link } from "react-router-dom";
import hireflowLogo from "@/assets/hireflow-light.svg";

const MarketplaceTerms = () => {
  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <nav className="sticky top-0 z-50 border-b border-[#222121]/10 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center">
            <img src={hireflowLogo} alt="Hireflow" className="h-8" />
          </Link>
          <Link
            to="/marketplace"
            className="text-sm font-medium text-[#222121]/60 transition-colors hover:text-[#34B192]"
          >
            Back to Marketplace
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-[#222121]/10 bg-white p-6 shadow-[0_12px_40px_rgba(34,33,33,0.06)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#34B192]">
            Marketplace
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[#222121] sm:text-4xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-2 text-sm text-[#222121]/60">
            Last updated: January 29, 2026
          </p>

          <section className="mt-8 space-y-6 text-sm text-[#222121]/80">
            <p>
              This page outlines the terms for registering interest in marketplace leads. Please read
              carefully before submitting your details.
            </p>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#222121]">1. Marketplace Lead Access</h2>
              <p>
                By registering interest, you acknowledge that lead details are shared on a limited,
                first-come basis and availability is not guaranteed.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#222121]">2. Data Use &amp; Privacy</h2>
              <p>
                We use the information you submit to contact you about the opportunity. We do not
                sell your details to third parties.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#222121]">3. Eligibility</h2>
              <p>
                You confirm you are authorized to represent your company when submitting interest.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#222121]">4. Contact</h2>
              <p>
                If you have any questions about these terms, contact the Hireflow team.
              </p>
            </div>

            <div className="rounded-2xl border border-[#222121]/10 bg-[#F7F7F7] p-4 text-xs text-[#222121]/60">
              Replace this content with your finalized Terms &amp; Conditions copy.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default MarketplaceTerms;
