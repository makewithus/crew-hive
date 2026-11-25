"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import PublicNavbar from "@/components/PublicNavbar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignUpModal from "@/components/SignUpModal";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lock,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export default function AccountDeletionPage() {
  const { currentUser, userPhone, userRole, logout, isAuthenticated } = useAuth();
  const { t, isMalayalam } = useLanguage();
  const router = useRouter();

  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signUpRole, setSignUpRole] = useState(null);

  const handleOpenSignUp = (role) => {
    setSignUpRole(role);
    setSignUpOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (!confirmed || deleting) return;
    setDeleting(true);

    try {
      const res = await apiFetch("/api/account", {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account. Please try again.");
      }

      setDeleted(true);
      toast.success(
        isMalayalam
          ? "നിങ്ങളുടെ അക്കൗണ്ട് വിജയകരമായി ഒഴിവാക്കി."
          : "Your account has been permanently deleted."
      );

      // Clean local session state
      if (typeof window !== "undefined") {
        try {
          sessionStorage.clear();
          localStorage.removeItem("crewhive_auth_token");
          localStorage.removeItem("crewhive_user_role");
        } catch (_) {}
      }

      if (logout) {
        try {
          await logout();
        } catch (_) {}
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  const erasedItems = t("legal.deletion.erasedItems", [
    "Your personal profile, name, phone number, and account credentials",
    "Your professional roles, specialisations, experience, bio, and portfolio links",
    "Your active availability status, location history, and availability request records",
    "Your saved shortlists, custom show rosters, and association memberships",
    "Your device registration tokens, in-app notifications, and block lists",
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {isAuthenticated ? <Header /> : <PublicNavbar onOpenSignUp={handleOpenSignUp} />}

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full space-y-8">
        {/* Header */}
        <div className="border-b border-border pb-6 sm:pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold mb-3 sm:mb-4">
            <Lock className="w-3.5 h-3.5" />
            <span>{t("legal.deletion.subtitle", "Digital Personal Data Protection (DPDP) Act Compliance")}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground mb-3 tracking-tight">
            {t("legal.deletion.title", "Account & Data Deletion")}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {t(
              "legal.deletion.intro",
              "In accordance with India's Digital Personal Data Protection Act, 2023, you have the full right to delete your CrewHive account and request erasure of your personal data at any time."
            )}
          </p>
        </div>

        {deleted ? (
          /* ── SUCCESS STATE ── */
          <div className="bg-card border border-border rounded-2xl p-8 sm:p-10 text-center space-y-4 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              {t("legal.deletion.deletedTitle", "Account Successfully Deleted")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {t(
                "legal.deletion.deletedMessage",
                "Your CrewHive account and associated personal data have been permanently erased from our systems."
              )}
            </p>
            <div className="pt-4">
              <Link href="/">
                <Button className="bg-primary text-primary-foreground font-semibold text-xs px-6 py-2.5">
                  {isMalayalam ? "ഹോം പേജിലേക്ക് മടങ്ങുക" : "Return to Homepage"}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* ── MAIN CONTENT ── */
          <div className="space-y-8">
            {/* What is erased */}
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 space-y-4 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                <Trash2 className="w-4 h-4 text-destructive" />
                <span>{t("legal.deletion.erasedTitle", "What Data is Permanently Erased")}</span>
              </h2>
              <ul className="space-y-2.5 text-xs sm:text-sm text-muted-foreground">
                {Array.isArray(erasedItems) &&
                  erasedItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
              </ul>
            </div>

            {/* What is retained */}
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 space-y-3 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-primary" />
                <span>{t("legal.deletion.retainedTitle", "What is Retained or Anonymized")}</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t(
                  "legal.deletion.retainedDesc",
                  "To prevent fraud and comply with statutory dispute obligations, anonymized moderation records (names and phone numbers stripped) and dispute audit logs (numeric IDs only) are retained strictly as required by law."
                )}
              </p>
            </div>

            {/* How to request deletion */}
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 space-y-3 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                <Info className="w-4 h-4 text-amber-400" />
                <span>{t("legal.deletion.howToTitle", "How to Request Deletion")}</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t(
                  "legal.deletion.howToDesc",
                  "You can delete your account immediately using the secure form below when signed in, from the mobile application (Settings > Account > Delete Account), or by sending an email with proof of phone ownership to support@crewhive.in."
                )}
              </p>
            </div>

            {/* Action Area */}
            {isAuthenticated ? (
              <div className="bg-card border border-destructive/30 rounded-2xl p-6 sm:p-7 space-y-5 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {t("legal.deletion.confirmTitle", "Delete Account Permanently")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isMalayalam ? "ലോഗിൻ ചെയ്തിരിക്കുന്ന അക്കൗണ്ട്:" : "Signed in account:"}{" "}
                      <span className="font-semibold text-foreground">{userPhone || currentUser?.phoneNumber || "Active User"}</span>{" "}
                      ({userRole || "User"})
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive leading-relaxed">
                  {t(
                    "legal.deletion.confirmWarning",
                    "Warning: This action is permanent and immediate. Once deleted, your profile, work records, and connections cannot be recovered."
                  )}
                </div>

                <label className="flex items-start gap-3 cursor-pointer pt-1 select-none">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-border accent-destructive cursor-pointer"
                  />
                  <span className="text-xs text-foreground font-medium">
                    {t(
                      "legal.deletion.confirmCheckbox",
                      "I understand that deleting my account will permanently erase my profile and all associated data from CrewHive."
                    )}
                  </span>
                </label>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={!confirmed || deleting}
                    className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-xs px-6 py-3 min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {deleting
                        ? t("legal.deletion.deleting", "Deleting Account...")
                        : t("legal.deletion.deleteButton", "Permanently Delete My Account")}
                    </span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
                <h3 className="text-base font-bold text-foreground">
                  {t("legal.deletion.signInPrompt", "Sign in to delete your account directly")}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {isMalayalam
                    ? "നിങ്ങളുടെ ഐഡന്റിറ്റി പരിശോധിക്കാനും അക്കൗണ്ട് സുരക്ഷിതമായി ഒഴിവാക്കാനും ആദ്യം ഫോൺ നമ്പർ ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യുക."
                    : "To verify your identity and delete your profile instantly, please sign in with your registered phone number."}
                </p>
                <div className="pt-2">
                  <Link href="/login">
                    <Button className="bg-primary text-primary-foreground font-semibold text-xs px-6 py-2.5 inline-flex items-center gap-2">
                      <span>{t("legal.deletion.signInButton", "Sign In with Phone")}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer onOpenSignUp={handleOpenSignUp} />

      <SignUpModal
        open={signUpOpen}
        onClose={() => setSignUpOpen(false)}
        initialRole={signUpRole}
      />
    </div>
  );
}

