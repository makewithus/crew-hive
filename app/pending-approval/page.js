"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Clock, CheckCircle2, MessageCircle, LogOut } from "lucide-react";
import { signOutUser } from "@/lib/auth";

export default function PendingApprovalPage() {
  const { currentUser, userRole, userApproved, loading } = useAuth();
  const router = useRouter();

  // If crew gets approved, redirect to their dashboard
  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    if (userRole === "crew" && userApproved) {
      router.replace("/crew/dashboard");
    }
    if (userRole === "organizer") {
      router.replace("/organizer/dashboard");
    }
    if (userRole === "super_admin") {
      router.replace("/super-admin/dashboard");
    }
  }, [loading, currentUser, userRole, userApproved, router]);

  const handleSignOut = async () => {
    await signOutUser();
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-125 h-125 bg-primary/6 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <span className="text-primary-foreground font-bold text-lg">C</span>
          </div>
          <span className="text-2xl font-bold text-foreground">CrewHive</span>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-10 h-10 text-amber-400" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            Profile Under Review
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Your crew profile has been submitted and is currently being reviewed
            by our admin team. This usually takes a short while — we'll notify
            you on WhatsApp once you're approved.
          </p>

          {/* What happens next */}
          <div className="space-y-3 text-left mb-6">
            {[
              {
                icon: <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />,
                text: "Your profile details have been saved",
              },
              {
                icon: <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
                text: "Admin will review and approve your profile",
              },
              {
                icon: <MessageCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />,
                text: "You'll receive a WhatsApp notification when approved",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                {item.icon}
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-muted border border-border text-foreground font-medium py-2.5 rounded-xl hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400 transition-all text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Questions?{" "}
          <a
            href="https://wa.me/918139002826?text=Hi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Contact us on WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
}
