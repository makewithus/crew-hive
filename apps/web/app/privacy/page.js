"use client";

import { useState } from "react";
import PublicNavbar from "@/components/PublicNavbar";
import Footer from "@/components/Footer";
import SignUpModal from "@/components/SignUpModal";
import { useLanguage } from "@/context/LanguageContext";
import { Lock, MapPin, EyeOff } from "lucide-react";

export default function PrivacyPage() {
  const { t, getSection, isMalayalam } = useLanguage();
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signUpRole, setSignUpRole] = useState(null);

  const handleOpenSignUp = (role) => {
    setSignUpRole(role);
    setSignUpOpen(true);
  };

  const sections = getSection("legal.privacy.sections") || [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicNavbar onOpenSignUp={handleOpenSignUp} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 w-full">
        {/* Header */}
        <div className="border-b border-border pb-6 sm:pb-8 mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3 sm:mb-4">
            <Lock className="w-3.5 h-3.5" />
            <span>{isMalayalam ? "വിവര സുരക്ഷയും സുതാര്യതയും" : "Data Protection & Transparency"}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-3 break-words">
            {t("legal.privacy.title", "Privacy Policy")}
          </h1>
          <p className="text-xs sm:text-sm text-primary font-medium mb-3 sm:mb-4">
            {t("legal.privacy.lastUpdated", "Effective Date: January 1, 2027 (Pre-launch Version)")}
          </p>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {t(
              "legal.privacy.intro",
              "At CrewHive, we respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy describes how we collect, use, and safeguard your data when using our website and WhatsApp onboarding services."
            )}
          </p>
        </div>

        {/* Highlight callouts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 sm:mb-10">
          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card/60">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-sm mb-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{isMalayalam ? "ലൊക്കേഷൻ നയം" : "Location Policy"}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isMalayalam
                ? "സെർച്ച് ആവശ്യങ്ങൾക്കായി നിങ്ങൾ നൽകുന്ന കേരളത്തിലെ ജില്ലയോ നഗരമോ മാത്രമേ ഞങ്ങൾ സൂക്ഷിക്കുന്നുള്ളൂ. തത്സമയ ജി.പി.എസ് (GPS) ലൊക്കേഷൻ ഞങ്ങൾ ട്രാക്ക് ചെയ്യുന്നില്ല."
                : "We only store your self-declared district or city in Kerala for crew search indexing. We do NOT track continuous live GPS coordinates or background location."}
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card/60">
            <div className="flex items-center gap-2.5 text-foreground font-semibold text-sm mb-1.5">
              <EyeOff className="w-4 h-4 text-primary" />
              <span>{isMalayalam ? "വിവരങ്ങൾ വിൽക്കില്ല" : "No Commercial Data Sale"}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isMalayalam
                ? "നിങ്ങളുടെ വ്യക്തിഗത വിവരങ്ങളോ ഫോൺ നമ്പറോ പരസ്യ ഏജൻസികൾക്കോ മൂന്നാം കക്ഷികൾക്കോ ഞങ്ങൾ വിൽക്കുകയോ കൈമാറുകയോ ചെയ്യില്ല."
                : "We never sell or rent your personal contact information to advertising brokers or external marketers."}
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6 sm:space-y-8 text-sm text-muted-foreground leading-relaxed">
          {sections.map((sec, idx) => (
            <section
              key={idx}
              className="bg-card/40 border border-border/80 rounded-2xl p-5 sm:p-7 hover:border-border transition-all"
            >
              <h2 className="text-base sm:text-lg font-bold text-foreground mb-3">
                {sec.heading}
              </h2>
              <p className="whitespace-pre-line text-muted-foreground leading-relaxed text-xs sm:text-sm">
                {sec.content}
              </p>
            </section>
          ))}
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

