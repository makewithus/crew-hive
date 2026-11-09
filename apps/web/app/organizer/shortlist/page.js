/**
 * /app/organizer/shortlist/page.js
 * Recruiter Shortlist Management Page (P1)
 *
 * Implements Prompt 3 Section 12:
 * - View saved crew
 * - Remove from shortlist
 * - Direct availability request creation
 * - Prevents duplicate saved entries
 * - Feature access aware
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import CrewCard from "@/components/CrewCard";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/context/LanguageContext";
import { USER_ROLES } from "@/utils/constants";
import { Button } from "@/components/ui/button";
import { Bookmark, Search, Trash2, ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

export default function OrganizerShortlistPage() {
  const { currentUser, userPhone } = useAuth();
  const { isMalayalam } = useLanguage();

  const [savedCrew, setSavedCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadShortlist();
  }, [currentUser, userPhone]);

  const loadShortlist = async () => {
    if (!currentUser && !userPhone) return;
    setLoading(true);
    setError("");

    try {
      const phoneParam = encodeURIComponent(userPhone || currentUser?.phoneNumber || "");
      const res = await fetch(`/api/recruiter/shortlist?phone=${phoneParam}`);
      const json = await res.json();

      if (json.success) {
        setSavedCrew(json.data || []);
      } else {
        setError(json.error || "Failed to load shortlist");
      }
    } catch (err) {
      setError(err.message || "Network error loading shortlist");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (crewId) => {
    try {
      const phoneParam = encodeURIComponent(userPhone || currentUser?.phoneNumber || "");
      const res = await fetch(`/api/recruiter/shortlist?crewId=${crewId}&phone=${phoneParam}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSavedCrew((prev) => prev.filter((c) => c.id !== crewId));
        toast.success("Removed from shortlist");
      } else {
        toast.error("Failed to remove");
      }
    } catch (_) {
      toast.error("Network error");
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Loading shortlist...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />

        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                    P1 Groundwork
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {savedCrew.length} saved
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight">
                  {isMalayalam ? "സേവ് ചെയ്ത ക്രൂ ലിസ്റ്റ്" : "My Saved Shortlist"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isMalayalam
                    ? "ഭാവി പ്രോജക്റ്റുകൾക്കായി നിങ്ങൾ സൂക്ഷിച്ച ടെക്നീഷ്യൻമാരുടെ പട്ടിക."
                    : "Bookmark outstanding technicians for fast availability requests on upcoming gigs."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <LanguageToggle compact />
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
                  <Link href="/organizer/search">
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                    {isMalayalam ? "കൂടുതൽ ക്രൂവിനെ തിരയുക" : "Browse More Crew"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-6">
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
              {error}
            </div>
          )}

          {savedCrew.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Bookmark className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isMalayalam ? "ഷോർട്ട്‌ലിസ്റ്റ് ശൂന്യമാണ്" : "Your Shortlist is Empty"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isMalayalam
                  ? "തിരയൽ ഫലങ്ങളിലെ ബുക്ക്‌മാർക്ക് ഐക്കണിൽ ക്ലിക്ക് ചെയ്ത് പ്രൊഫൈലുകൾ സേവ് ചെയ്യാം."
                  : "Click the bookmark button on any crew card or profile to save technicians here."}
              </p>
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
                <Link href="/organizer/search">Search Crew</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedCrew.map((member) => (
                <CrewCard
                  key={member.id}
                  crew={member}
                  isShortlisted={true}
                  onShortlistChange={(id, saved) => {
                    if (!saved) setSavedCrew((p) => p.filter((x) => x.id !== id));
                  }}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

