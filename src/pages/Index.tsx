import { HeroSection } from "@/components/landing/HeroSection";
import { WhyChooseSection } from "@/components/landing/WhyChooseSection";
import { DifferenceSection } from "@/components/landing/DifferenceSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { WhatsIncludedSection } from "@/components/landing/WhatsIncludedSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <HeroSection />
      <WhyChooseSection />
      <DifferenceSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <WhatsIncludedSection />
      <FAQSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
};

export default Index;
