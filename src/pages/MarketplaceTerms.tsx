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
              These Terms &amp; Conditions govern your access to the Hireflow Marketplace and your
              submission of interest in any lead. By submitting your details, you agree to these
              Terms and confirm you have authority to bind the company you represent.
            </p>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#222121]">1. Marketplace Access &amp; No Exclusivity</h2>
              <p>
                Marketplace leads are non-exclusive and may be shown to multiple parties. We make no
                promise of exclusivity, reservation, or priority unless explicitly agreed in writing
                by Hireflow.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#222121]">2. No Guarantee of Availability or Outcomes</h2>
              <p>
                Lead availability can change at any time. We do not guarantee that a lead will be
                available, accurate, complete, or suitable for your needs, nor do we guarantee any
                business outcomes, placements, or revenue.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#222121]">3. Data Use, Ownership &amp; Resale Rights</h2>
              <p>
                You grant Hireflow a perpetual, irrevocable, worldwide, transferable license to
                store, use, reproduce, modify, analyze, aggregate, and commercialize any information
                you submit in connection with the Marketplace. This includes the right to share or
                resell data and insights to third parties without restriction, unless prohibited by
                law.
              </p>
              <p>
                You acknowledge that Hireflow may retain your data indefinitely and may combine it
                with other data sources. You represent that you have all necessary rights and
                consents to provide this data to us.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#222121]">4. Marketing Consent &amp; Opt-Out</h2>
              <p>
                By submitting your details, you expressly agree that Hireflow may contact you for
                marketing purposes at any time via email, phone, or other channels. This consent is
                ongoing unless you explicitly opt out using the unsubscribe link in our messages or
                by contacting our support team. Opting out does not affect data retention or
                previously granted rights.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#222121]">5. Confidentiality</h2>
              <p>
                Any lead information provided may be confidential. You agree not to disclose it to
                third parties except as required to evaluate or pursue the opportunity.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#222121]">6. Acceptable Use</h2>
              <p>
                You may not misuse the Marketplace, attempt to scrape data, or access leads for any
                purpose other than evaluating or pursuing legitimate hiring opportunities.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#222121]">7. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Hireflow will not be liable for any indirect,
                incidental, special, or consequential damages, or any loss of profits, revenue, data,
                or business arising from your use of the Marketplace or any lead data.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#222121]">8. Changes</h2>
              <p>
                We may update these Terms at any time. Continued use of the Marketplace after
                changes constitutes acceptance of the updated Terms.
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#222121]">9. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the applicable jurisdiction for Hireflow.
                If you need a specific jurisdiction listed here, contact us.
              </p>
            </div>

            <div className="rounded-2xl border border-[#222121]/10 bg-[#F7F7F7] p-4 text-xs text-[#222121]/60">
              If you want jurisdiction-specific language (e.g., US/UK/EU) or a tailored privacy
              notice, provide your preference and we will update this page.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default MarketplaceTerms;
