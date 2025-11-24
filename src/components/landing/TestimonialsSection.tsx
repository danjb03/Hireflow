import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

export const TestimonialsSection = () => {
  const testimonials = [
    {
      quote: "Booked 5 qualified meetings in the first two weeks. Already closed our first placement worth £18k. Incredible ROI.",
      name: "Sarah Mitchell",
      company: "Director, TalentFirst Recruitment"
    },
    {
      quote: "We were spending £40k/year on a BD rep who brought in maybe 2-3 decent clients. Hireflow generated 15 qualified leads in month one at half the cost.",
      name: "James Parker",
      company: "Founder, Parker Recruitment Solutions"
    },
    {
      quote: "The quality is what surprised me. These aren't tire-kickers - they're companies with real hiring needs and budget. Game changer for our agency.",
      name: "Emma Richardson",
      company: "MD, Richardson & Associates"
    },
    {
      quote: "Within 6 weeks we had 12 new client meetings booked. The personalization in the emails is incredible - you can tell it's AI but it doesn't feel robotic.",
      name: "David Chen",
      company: "Director, Tech Talent Partners"
    },
    {
      quote: "We tried building our own outreach team. Took 4 months and £30k before we got our first result. With Hireflow, we had leads in week 2. Should have done this sooner.",
      name: "Rachel Stevens",
      company: "Founder, Stevens Executive Search"
    },
    {
      quote: "The transparency is refreshing. I can see exactly how many emails are sent, opens, replies, and meetings booked. No smoke and mirrors, just results.",
      name: "Michael Brown",
      company: "Managing Partner, Brown & Partners"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a]">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              See Our Client Results for Yourself
            </h2>
            <p className="text-lg text-white/70">
              Real results from real recruitment agencies
            </p>
          </div>

          {/* Featured Testimonial */}
          <Card className="bg-gradient-to-br from-[#64df88] to-[#35b192] border-0 mb-12 shadow-2xl">
            <CardContent className="p-8 md:p-10">
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-6 w-6 fill-white text-white" />
                ))}
              </div>
              
              <p className="text-white text-lg md:text-xl leading-relaxed mb-8 font-medium">
                "Hireflow have been a key part of our company scaling. Initially we tested a batch of 50 leads which quickly turned into 100+ on a monthly basis. So far we have converted 3 placements in 90 days and have another 130k to place before the end of the year. Alongside this I'm saving 60k+ a year on internal BD. Highly recommend."
              </p>

              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-2xl font-bold">H</span>
                </div>
                <div>
                  <p className="text-white font-bold text-lg">Harry</p>
                  <p className="text-white/90">Managing Director, Hyrra</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Testimonials Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur hover:bg-white/10 transition-all">
                <CardContent className="pt-6">
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-[#64df88] text-[#64df88]" />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-white/90 mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </p>

                  {/* Author */}
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-white font-semibold">
                      {testimonial.name}
                    </p>
                    <p className="text-white/60 text-sm">
                      {testimonial.company}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};