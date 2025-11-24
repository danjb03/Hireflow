import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQSection = () => {
  const faqs = [
    {
      question: "How quickly will I start seeing results?",
      answer: "Most clients start receiving qualified leads within the first 2-3 weeks of campaign launch. However, we recommend giving campaigns 30-45 days to fully optimize and reach peak performance."
    },
    {
      question: "What makes you different from other lead gen companies?",
      answer: "Three things: 1) We specialize in recruitment - we understand your industry deeply. 2) Performance-based model - we only succeed when you succeed. 3) Multi-channel approach - we use both AI-powered email and strategic calling for maximum results."
    },
    {
      question: "How do you ensure lead quality?",
      answer: "We use detailed ICP targeting, qualification frameworks, and continuous optimization. Plus, you have a dedicated account manager who learns your exact requirements and adjusts campaigns accordingly."
    },
    {
      question: "Do I need to sign a long-term contract?",
      answer: "No. We work on a performance basis. If we're not delivering results, you're free to stop at any time. We believe in earning your business every single month."
    },
    {
      question: "What types of recruitment agencies do you work with?",
      answer: "We work with all recruitment verticals - tech recruitment, healthcare, finance, executive search, and more. Our strategies adapt to your specific niche and ideal client profile."
    },
    {
      question: "How is this different from hiring an in-house BD team?",
      answer: "Lower cost, faster setup, no management overhead, and proven systems. You're essentially hiring a team of specialists for less than the cost of one BD rep."
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-white/5 border border-white/10 rounded-lg px-6 backdrop-blur"
              >
                <AccordionTrigger className="text-white hover:text-[#64df88] text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-white/70 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};