import { Card, CardContent } from "@/components/ui/card";
import { Phone, Settings, Rocket, Briefcase } from "lucide-react";

export const HowItWorksSection = () => {
  const steps = [
    {
      icon: Phone,
      number: "01",
      title: "Discovery & Strategy Call",
      description: "We'll hop on a call to understand your ideal client profile, your service offerings, and your goals. We'll formulate an initial campaign strategy tailored to your agency."
    },
    {
      icon: Settings,
      number: "02",
      title: "Campaign Setup (7-14 Days)",
      description: "We build your target lists, craft personalized messaging, and set up all the tech infrastructure. You'll review and approve everything before we launch."
    },
    {
      icon: Rocket,
      number: "03",
      title: "Launch & Optimize",
      description: "Your campaigns go live. We monitor performance daily, test different approaches, and continuously optimize for better results. You start receiving qualified leads."
    },
    {
      icon: Briefcase,
      number: "04",
      title: "Fill Your Pipeline & Close More Business",
      description: "Enjoy a consistent flow of qualified recruitment clients coming to you. Focus on what you do best - making placements - while we handle lead generation."
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How Does The Process Work?
            </h2>
            <p className="text-lg text-muted-foreground">
              From first call to closed clients - here's how we fill your pipeline
            </p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-2 gap-8">
            {steps.map((step, index) => (
              <Card key={index} className="border-border hover:shadow-lg transition-all relative overflow-hidden">
                {/* Gradient accent */}
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#64df88] to-[#35b192]" />
                
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-[#64df88] to-[#35b192] flex items-center justify-center flex-shrink-0">
                      <step.icon className="h-7 w-7 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="text-sm font-bold text-[#64df88] mb-2">
                        STEP {step.number}
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-3">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
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