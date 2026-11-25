"use client";

import { useState } from "react";
import PublicNavbar from "@/components/PublicNavbar";
import Footer from "@/components/Footer";
import SignUpModal from "@/components/SignUpModal";
import { useLanguage } from "@/context/LanguageContext";
import { FileText, CheckCircle2 } from "lucide-react";

export default function TermsPage() {
  const { t, getSection, isMalayalam } = useLanguage();
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signUpRole, setSignUpRole] = useState(null);

  const handleOpenSignUp = (role) => {
    setSignUpRole(role);
    setSignUpOpen(true);
  };

  const sections = getSection("legal.terms.sections") || [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicNavbar onOpenSignUp={handleOpenSignUp} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20 w-full">
        {/* Header */}
        <div className="border-b border-border pb-6 sm:pb-8 mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3 sm:mb-4">
            <FileText className="w-3.5 h-3.5" />
            <span>{isMalayalam ? "ക്രൂഹൈവ് നിയമപരമായ വിവരങ്ങൾ" : "CrewHive Legal & Governance"}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-3 break-words">
            {t("legal.terms.title", "Terms and Conditions")}
          </h1>
          <p className="text-xs sm:text-sm text-primary font-medium mb-3 sm:mb-4">
            {t("legal.terms.lastUpdated", "Effective Date: January 1, 2027 (Pre-launch Version)")}
          </p>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {t(
              "legal.terms.intro",
              "Welcome to CrewHive. By accessing or using the CrewHive platform (via web, mobile web, or our WhatsApp onboarding service), you agree to be bound by these Terms and Conditions."
            )}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6 sm:space-y-8 text-sm text-muted-foreground leading-relaxed">
          {sections.map((sec, idx) => (
            <section
              key={idx}
              className="bg-card/40 border border-border/80 rounded-2xl p-5 sm:p-7 hover:border-border transition-all"
            >
              <h2 className="text-base sm:text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                <span>{sec.heading}</span>
              </h2>
              <p className="whitespace-pre-line text-muted-foreground leading-relaxed text-xs sm:text-sm">
                {sec.content}
              </p>
            </section>
          ))}
        </div>

        {/* Notice Card */}
        <div className="mt-8 sm:mt-12 p-5 sm:p-6 rounded-2xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {isMalayalam
              ? "ക്രൂഹൈവ് എന്നത് ഓഡിയോ-വിഷ്വൽ സാങ്കേതിക വിദഗ്ദ്ധരെയും റിക്രൂട്ടർമാരെയും തമ്മിൽ ബന്ധിപ്പിക്കുന്ന ഒരു പ്ലാറ്റ്‌ഫോമാണ്. ഞങ്ങൾ വേതന കമ്മീഷനുകളോ ഇൻഷുറൻസ് പരിരക്ഷയോ നൽകുന്നില്ല, നേരിട്ടുള്ള തൊഴിൽ ദാതാവല്ല."
              : "CrewHive operates as an audio-visual talent directory and coordination tool. We do not participate in billing commissions, nor do we act as an insurance underwriter or legal employer for productions in Kerala."}
          </p>
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

