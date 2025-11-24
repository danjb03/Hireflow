import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import harryPhoto from "@/assets/harry-hyrra.png";

export const TestimonialsSection = () => {
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
                <img 
                  src={harryPhoto} 
                  alt="Harry" 
                  className="h-16 w-16 rounded-full object-cover flex-shrink-0"
                />
                <div>
                  <p className="text-white font-bold text-lg">Harry</p>
                  <p className="text-white/90">Managing Director, Hyrra</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};