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
        </div>
      </div>
    </section>
  );
};
