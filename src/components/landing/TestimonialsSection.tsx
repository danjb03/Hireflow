import { useEffect } from "react";
import { Star } from "lucide-react";

// Type declaration for wistia-player custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'wistia-player': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'media-id'?: string;
          aspect?: string;
        },
        HTMLElement
      >;
    }
  }
}
import harryPhoto from "@/assets/harry-hyrra.png";

export const TestimonialsSection = () => {
  useEffect(() => {
    const existingPlayer = document.querySelector(
      "script[src=\"https://fast.wistia.com/player.js\"]"
    );
    if (!existingPlayer) {
      const playerScript = document.createElement("script");
      playerScript.src = "https://fast.wistia.com/player.js";
      playerScript.async = true;
      document.body.appendChild(playerScript);
    }

    const existingEmbed = document.querySelector(
      "script[src=\"https://fast.wistia.com/embed/0d090b5m4f.js\"]"
    );
    if (!existingEmbed) {
      const embedScript = document.createElement("script");
      embedScript.src = "https://fast.wistia.com/embed/0d090b5m4f.js";
      embedScript.async = true;
      embedScript.type = "module";
      document.body.appendChild(embedScript);
    }

    // DSD testimonial video
    const existingDsdEmbed = document.querySelector(
      "script[src=\"https://fast.wistia.com/embed/20jpmcshz5.js\"]"
    );
    if (!existingDsdEmbed) {
      const dsdEmbedScript = document.createElement("script");
      dsdEmbedScript.src = "https://fast.wistia.com/embed/20jpmcshz5.js";
      dsdEmbedScript.async = true;
      dsdEmbedScript.type = "module";
      document.body.appendChild(dsdEmbedScript);
    }

    // Square Logic testimonial video
    const existingSquareLogicEmbed = document.querySelector(
      "script[src=\"https://fast.wistia.com/embed/lz51ll085q.js\"]"
    );
    if (!existingSquareLogicEmbed) {
      const squareLogicEmbedScript = document.createElement("script");
      squareLogicEmbedScript.src = "https://fast.wistia.com/embed/lz51ll085q.js";
      squareLogicEmbedScript.async = true;
      squareLogicEmbedScript.type = "module";
      document.body.appendChild(squareLogicEmbedScript);
    }
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#F7F7F7] py-20 md:py-28">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(52,177,146,0.06),transparent_60%),radial-gradient(circle_at_bottom_left,rgba(52,177,146,0.04),transparent_65%),radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_70%)]" />
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
                <span className="size-2 rounded-full bg-[#34B192]" />
                Client results
              </div>
              <h2 className="mt-6 text-4xl font-semibold text-[#222121] md:text-5xl">
                <span className="text-[#222121]/40">Proof that predictable</span>{" "}
                <span className="text-[#222121]">outreach drives placements.</span>
              </h2>
              <p className="mt-5 text-base text-[#222121]/70">
                Recruitment teams rely on Hireflow for consistent meetings, clean reporting, and leads that convert.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-4xl font-semibold text-[#34B192]">3</div>
                  <p className="mt-2 text-sm text-[#222121]/50">
                    Placements in 90 days
                  </p>
                </div>
                <div>
                  <div className="text-4xl font-semibold text-[#222121]">GBP 130k</div>
                  <p className="mt-2 text-sm text-[#222121]/50">
                    Pipeline value secured
                  </p>
                </div>
              </div>

            </div>

            <div className="space-y-8">
              <div className="mt-12 rounded-2xl border border-[#222121]/[0.08] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <style>{`
                  wistia-player[media-id='0d090b5m4f']:not(:defined) {
                    background: center / contain no-repeat url('https://fast.wistia.com/embed/medias/0d090b5m4f/swatch');
                    display: block;
                    filter: blur(5px);
                    padding-top: 100%;
                  }
                `}</style>
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-[#222121]/10 bg-[#F7F7F7]">
                  <wistia-player media-id="0d090b5m4f" aspect="1.7777777778"></wistia-player>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 rounded-2xl border border-[#222121]/[0.08] bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-5 fill-[#34B192] text-[#34B192]" />
              ))}
            </div>
            <p className="mt-6 text-base text-[#222121]/80 md:text-lg">
              "Hireflow have been a key part of our company scaling. We tested a batch of leads and quickly scaled to 100+ per month. We have already converted three placements in 90 days and have another 130k in the pipeline."
            </p>
            <div className="mt-6 flex items-center gap-4">
              <img
                src={harryPhoto}
                alt="Harry"
                className="size-12 rounded-xl object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-[#222121]">Harry</p>
                <p className="text-xs text-[#222121]/60">
                  Managing Director, Hyrra
                </p>
              </div>
            </div>
          </div>

          {/* DSD Testimonial Section */}
          <div className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
                <span className="size-2 rounded-full bg-[#34B192]" />
                Long-term partnership
              </div>
              <h2 className="mt-6 text-4xl font-semibold text-[#222121] md:text-5xl">
                <span className="text-[#222121]/40">3 years of</span>{" "}
                <span className="text-[#222121]">scaling together.</span>
              </h2>
              <p className="mt-5 text-base text-[#222121]/70">
                3000+ leads generated for DSD. Over 220+ leads a month. Over 3 years of development with Nick from DSD to get him the speed of recruitment he needed to scale his business.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-4xl font-semibold text-[#34B192]">3000+</div>
                  <p className="mt-2 text-sm text-[#222121]/50">
                    Total leads generated
                  </p>
                </div>
                <div>
                  <div className="text-4xl font-semibold text-[#222121]">220+</div>
                  <p className="mt-2 text-sm text-[#222121]/50">
                    Leads per month
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="mt-12 rounded-2xl border border-[#222121]/[0.08] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <style>{`
                  wistia-player[media-id='20jpmcshz5']:not(:defined) {
                    background: center / contain no-repeat url('https://fast.wistia.com/embed/medias/20jpmcshz5/swatch');
                    display: block;
                    filter: blur(5px);
                    padding-top: 56.25%;
                  }
                `}</style>
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-[#222121]/10 bg-[#F7F7F7]">
                  <wistia-player media-id="20jpmcshz5" aspect="1.7777777777777777"></wistia-player>
                </div>
              </div>
            </div>
          </div>

          {/* Square Logic Testimonial Section */}
          <div className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
                <span className="size-2 rounded-full bg-[#34B192]" />
                Marketplace outcomes
              </div>
              <h2 className="mt-6 text-4xl font-semibold text-[#222121] md:text-5xl">
                <span className="text-[#222121]/40">Delivery-first</span>{" "}
                <span className="text-[#222121]">growth with Hireflow.</span>
              </h2>
              <p className="mt-5 text-base text-[#222121]/70">
                Yaseen from Square Logic sat down with Connor to share how Hireflow helped the team focus on delivery
                while driving consistent sales conversations.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-4xl font-semibold text-[#34B192]">42</div>
                  <p className="mt-2 text-sm text-[#222121]/50">
                    Conversations booked
                  </p>
                </div>
                <div>
                  <div className="text-4xl font-semibold text-[#222121]">30/50</div>
                  <p className="mt-2 text-sm text-[#222121]/50">
                    Sales calls from leads
                  </p>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-3 rounded-xl border border-[#222121]/10 bg-white px-4 py-3">
                <img src="/logos/squarelogik.svg" alt="Squarelogik" className="h-6 w-auto" />
                <div>
                  <p className="text-sm font-semibold text-[#222121]">Yaseen</p>
                  <p className="text-xs text-[#222121]/60">Square Logic</p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="mt-12 rounded-2xl border border-[#222121]/[0.08] bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <style>{`
                  wistia-player[media-id='lz51ll085q']:not(:defined) {
                    background: center / contain no-repeat url('https://fast.wistia.com/embed/medias/lz51ll085q/swatch');
                    display: block;
                    filter: blur(5px);
                    padding-top: 56.25%;
                  }
                `}</style>
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-[#222121]/10 bg-[#F7F7F7]">
                  <wistia-player media-id="lz51ll085q" aspect="1.7777777777777777"></wistia-player>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
