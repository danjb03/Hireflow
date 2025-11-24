import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, TrendingDown, Zap } from "lucide-react";

export const WhyChooseSection = () => {
  const benefits = [
    {
      icon: Brain,
      title: "AI-Powered Personalization",
      description: "Every email is hyper-personalized using AI. We don't send spam - we send messages that speak directly to your ideal client's pain points, resulting in response rates that traditional BD teams can't match."
    },
    {
      icon: TrendingDown,
      title: "Cost-Effective Scaling",
      description: "Significantly less expensive than hiring in-house BD reps. No salaries, no training time, no management overhead. Get more leads for less investment while maintaining complete control of your pipeline."
    },
    {
      icon: Zap,
      title: "Fast & Seamless Setup",
      description: "We can have your lead generation campaign live in 7-14 days. A fraction of the time it would take to hire, train, and ramp up an internal team."
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Why Hireflow?
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              What is Hireflow? Hireflow is your dedicated lead generation partner, specialized in bringing high-quality recruitment clients straight to your pipeline. We use AI-powered cold email and strategic cold calling to connect you with companies actively looking to hire.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border-border hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#64df88] to-[#35b192] flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {benefit.description}
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