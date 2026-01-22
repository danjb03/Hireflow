import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How quickly will I start seeing results?",
    answer:
      "Most clients start receiving qualified leads within 2-3 weeks of launch. We recommend 30-45 days for full optimization.",
  },
  {
    question: "What makes you different from other lead gen companies?",
    answer:
      "We specialize in recruitment, operate on performance, and run multi-channel outreach with strong reporting.",
  },
  {
    question: "How do you ensure lead quality?",
    answer:
      "We use tight ICP targeting, qualification frameworks, and continuous optimization with a dedicated account manager.",
  },
  {
    question: "Do I need to sign a long-term contract?",
    answer:
      "No. If we are not delivering results, you are free to stop at any time.",
  },
  {
    question: "What types of recruitment agencies do you work with?",
    answer:
      "We work across sectors including tech, healthcare, finance, executive search, and more.",
  },
  {
    question: "How is this different from hiring an in-house BD team?",
    answer:
      "You get a specialist team with faster setup, lower cost, and no management overhead.",
  },
];

export const FAQSection = () => {
  return (
    <section className="relative overflow-hidden bg-[#F7F7F7] py-20 md:py-28">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(52,177,146,0.05),transparent_60%),radial-gradient(circle_at_bottom_right,rgba(52,177,146,0.04),transparent_65%),radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_70%)]" />
      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
              <span className="size-2 rounded-full bg-[#34B192]" />
              FAQs
            </div>
            <h2 className="mt-6 text-4xl font-semibold text-[#222121] md:text-5xl">
              <span className="text-[#222121]/40">Answers to the</span>{" "}
              <span className="text-[#222121]">questions you might have.</span>
            </h2>
          </div>

          <Accordion type="single" collapsible className="mt-12 space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.question}
                value={`item-${index}`}
                className="rounded-2xl border border-[#222121]/[0.08] bg-white px-6 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
              >
                <AccordionTrigger className="text-left text-base font-medium text-[#222121] hover:text-[#34B192]">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-[#222121]/60">
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
