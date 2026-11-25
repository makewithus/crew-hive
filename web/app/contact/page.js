"use client";

import { useState } from "react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import Footer from "@/components/Footer";
import SignUpModal from "@/components/SignUpModal";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useLanguage } from "@/context/LanguageContext";
import {
  MessageCircle,
  Mail,
  MapPin,
  Clock,
  Building2,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { getWhatsAppNumber, formatWhatsAppDisplay } from "@/lib/whatsapp-config";

export default function ContactPage() {
  const { t, getSection, isMalayalam } = useLanguage();
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signUpRole, setSignUpRole] = useState(null);

  const handleOpenSignUp = (role) => {
    setSignUpRole(role);
    setSignUpOpen(true);
  };

  const channels = getSection("legal.contact.channels") || [];
  const hours = getSection("legal.contact.hours") || {};
  const associationNote = getSection("legal.contact.associationNote") || {};
  const whatsappNumber = getWhatsAppNumber();
  const whatsappDisplay = formatWhatsAppDisplay(whatsappNumber);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicNavbar onOpenSignUp={handleOpenSignUp} />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3 sm:mb-4">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{isMalayalam ? "സഹായവും സമ്പർക്കവും" : "Support & Communications"}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 tracking-tight break-words">
            {t("legal.contact.title", "Contact CrewHive")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {t(
              "legal.contact.subtitle",
              "Get in touch with the team behind Kerala's dedicated AV and events crew network."
            )}
          </p>
        </div>

        {/* Contact Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {/* WhatsApp Channel */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6 flex flex-col justify-between hover:border-emerald-500/50 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <MessageCircle className="w-6 h-6 fill-current" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1">
                {channels[0]?.title || (isMalayalam ? "ഔദ്യോഗിക വാട്സ്ആപ്പ് സപ്പോർട്ട്" : "WhatsApp Channel")}
              </h2>
              <p className="text-lg font-bold text-emerald-400 mb-2 break-all">
                {whatsappDisplay}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                {channels[0]?.sub || (isMalayalam
                  ? "ക്രൂ രജിസ്ട്രേഷൻ, റിക്രൂട്ടർ അന്വേഷണങ്ങൾ എന്നിവയ്ക്കുള്ള ഏറ്റവും വേഗത്തിലുള്ള മാർഗ്ഗം."
                  : "Fastest support for technician registration, recruiter questions, and launch notifications.")}
              </p>
            </div>
            <div>
              <WhatsAppButton
                variant="primary"
                text={channels[0]?.actionText || (isMalayalam ? "വാട്സ്ആപ്പിൽ ചാറ്റ് ചെയ്യുക" : "Chat on WhatsApp")}
                message={isMalayalam ? "നമസ്കാരം, ക്രൂഹൈവിനെക്കുറിച്ച് കൂടുതൽ അറിയാൻ ആഗ്രഹിക്കുന്നു." : "Hi, I would like to inquire about CrewHive."}
                className="w-full min-h-[44px]"
              />
            </div>
          </div>

          {/* Email Support */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col justify-between hover:border-primary/40 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1">
                {channels[1]?.title || (isMalayalam ? "ഇമെയിൽ സപ്പോർട്ട്" : "Email Communications")}
              </h2>
              <p className="text-lg font-bold text-foreground mb-2 break-all">
                support@crewhive.in
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                {channels[1]?.sub || (isMalayalam
                  ? "അസോസിയേഷൻ പങ്കാളിത്തത്തിനും ഔദ്യോഗിക കാര്യങ്ങൾക്കും."
                  : "For association partnerships, press inquiries, and formal support requests.")}
              </p>
            </div>
            <div>
              <a
                href="mailto:support@crewhive.in"
                className="w-full inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground hover:border-primary/40 hover:bg-primary/5 font-semibold px-4 py-3 rounded-xl text-xs transition-all min-h-[44px]"
              >
                <Mail className="w-4 h-4 text-primary" />
                <span>{channels[1]?.actionText || (isMalayalam ? "ഇമെയിൽ അയക്കുക" : "Send Support Email")}</span>
              </a>
            </div>
          </div>

          {/* Regional Operations */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col justify-between hover:border-primary/40 transition-all">
            <div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-foreground mb-1">
                {channels[2]?.title || (isMalayalam ? "പ്രവർത്തന മേഖല" : "Regional Coverage")}
              </h2>
              <p className="text-lg font-bold text-foreground mb-2">
                {channels[2]?.detail || (isMalayalam ? "കേരളം, ഇന്ത്യ" : "Kerala, India")}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                {channels[2]?.sub || (isMalayalam
                  ? "14 ജില്ലകളിലും സേവനം: കൊച്ചി, തിരുവനന്തപുരം, കോഴിക്കോട്, തൃശൂർ ഉൾപ്പെടെ."
                  : "Serving production units and event venues across all 14 districts: Kochi, Thiruvananthapuram, Kozhikode, Thrissur & beyond.")}
              </p>
            </div>
            <div>
              <Link
                href="/#categories"
                className="w-full inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground hover:border-primary/40 hover:bg-primary/5 font-semibold px-4 py-3 rounded-xl text-xs transition-all min-h-[44px]"
              >
                <span>{channels[2]?.actionText || (isMalayalam ? "തൊഴിൽ വിഭാഗങ്ങൾ കാണുക" : "Explore Technical Crafts")}</span>
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
              </Link>
            </div>
          </div>
        </div>

        {/* Operating Hours & Associations Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Operating Hours */}
          <div className="rounded-2xl border border-border/80 bg-card/60 p-5 sm:p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground mb-1">
                {hours.title || "Support Hours"}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {hours.text ||
                  "Monday to Saturday, 9:30 AM – 6:30 PM IST. Emergency WhatsApp inquiries are monitored for scheduled live events."}
              </p>
            </div>
          </div>

          {/* Association Card */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground mb-1">
                  {associationNote.title || "Industry Associations & Guilds"}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {associationNote.text ||
                    "Are you a film guild, sound engineers association, or event managers union? Submit a partnership inquiry."}
                </p>
                <Link
                  href="/#for-associations"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline min-h-[36px]"
                >
                  <span>{associationNote.cta || "Association Inquiry Form"}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer onOpenSignUp={handleOpenSignUp} />
      <SignUpModal
        open={signUpOpen}
        onClose={() => setSignUpOpen(false)}
        defaultRole={signUpRole}
      />
    </div>
  );
}

