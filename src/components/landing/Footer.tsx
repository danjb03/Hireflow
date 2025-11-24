import hireflowLogo from "@/assets/hireflow-logo.svg";
import { Mail, Phone, Linkedin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-t border-white/10">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <img src={hireflowLogo} alt="Hireflow" className="h-10" />
            <p className="text-white/60 text-sm leading-relaxed">
              AI-powered lead generation for recruitment agencies. We help you scale your client acquisition with unlimited qualified leads.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-white/60 hover:text-[#64df88] transition-colors text-sm">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-white/60 hover:text-[#64df88] transition-colors text-sm">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#" className="text-white/60 hover:text-[#64df88] transition-colors text-sm">
                  Case Studies
                </a>
              </li>
              <li>
                <a href="#" className="text-white/60 hover:text-[#64df88] transition-colors text-sm">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Get In Touch</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-white/60 text-sm">
                <Mail className="h-4 w-4 text-[#64df88]" />
                <a href="mailto:hello@hireflow.com" className="hover:text-[#64df88] transition-colors">
                  hello@hireflow.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-white/60 text-sm">
                <Phone className="h-4 w-4 text-[#64df88]" />
                <a href="tel:+441234567890" className="hover:text-[#64df88] transition-colors">
                  +44 123 456 7890
                </a>
              </li>
              <li className="flex items-center gap-2 text-white/60 text-sm">
                <Linkedin className="h-4 w-4 text-[#64df88]" />
                <a href="#" className="hover:text-[#64df88] transition-colors">
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} Hireflow. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-white/40 hover:text-[#64df88] transition-colors text-sm">
              Privacy Policy
            </a>
            <a href="#" className="text-white/40 hover:text-[#64df88] transition-colors text-sm">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};