import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Target, LineChart, Eye } from "lucide-react";

export const DifferenceSection = () => {
  const features = [
    {
      icon: Award,
      title: "Performance-Based Model",
      description: "We only keep clients who we perform for. If we don't deliver qualified leads that turn into meetings and closed deals, we don't deserve your business. Simple as that."
    },
    {
      icon: Target,
      title: "Recruitment Industry Specialists",
      description: "We understand recruitment inside and out. We know what messaging works, what decision-makers care about, and how to position your services to stand out in a crowded market."
    },
    {
      icon: LineChart,
      title: "Multi-Channel Approach",
      description: "We don't rely on just one method. Our combination of AI-powered cold email and high-quality cold calling ensures maximum reach and consistent results."
    },
    {
      icon: Eye,
      title: "Transparent Reporting",
      description: "You'll always know exactly how your campaigns are performing. Real-time dashboards, weekly updates, and complete transparency into every lead we generate."
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              What Makes Us Different?
            </h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              Most lead gen agencies will take your money regardless of results. We're different. We only succeed when you succeed.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white/5 border-white/10 backdrop-blur hover:bg-white/10 transition-all">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#64df88] to-[#35b192] flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};