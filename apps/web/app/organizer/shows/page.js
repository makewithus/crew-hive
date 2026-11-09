/**
 * /app/organizer/shows/page.js
 * Crew For This Show Management (P1)
 *
 * Implements Prompt 3 Section 13:
 * - Create event/show lists (e.g., "Kochi Music Festival")
 * - Group roles under one show: Lighting, Sound, Rigging/Stage, Camera, etc.
 * - Add/view selected crew grouped by professional role
 * - Respects feature-access configuration
 * - Clear disclaimer: show list is an organizational roster, not a confirmed booking
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/context/LanguageContext";
import { USER_ROLES } from "@/utils/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Layers,
  Plus,
  Trash2,
  MapPin,
  Clock,
  Info,
  CheckCircle2,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function OrganizerShowsPage() {
  const { currentUser, userPhone } = useAuth();
  const { isMalayalam } = useLanguage();

  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create Show Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [selectedRoles, setSelectedRoles] = useState(["Sound", "Lighting", "Camera", "Stage"]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadShows();
  }, [currentUser, userPhone]);

  const loadShows = async () => {
    if (!currentUser && !userPhone) return;
    setLoading(true);
    setError("");

    try {
      const phoneParam = encodeURIComponent(userPhone || currentUser?.phoneNumber || "");
      const res = await fetch(`/api/recruiter/shows?phone=${phoneParam}`);
      const json = await res.json();

      if (json.success) {
        setShows(json.data || []);
      } else {
        setError(json.error || "Failed to load show rosters");
      }
    } catch (err) {
      setError(err.message || "Network error loading shows");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShow = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Show title is required.");
      return;
    }

    setCreating(true);
    try {
      const phoneParam = userPhone || currentUser?.phoneNumber || "";
      const res = await fetch("/api/recruiter/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          date: newDate,
          location: newLocation,
          roles: selectedRoles,
          recruiterPhone: phoneParam,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Show roster "${newTitle}" created!`);
        setShowCreateModal(false);
        setNewTitle("");
        setNewDate("");
        setNewLocation("");
        loadShows();
      } else {
        toast.error(json.error || "Failed to create show.");
      }
    } catch (_) {
      toast.error("Error creating show.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteShow = async (showId) => {
    try {
      const phoneParam = encodeURIComponent(userPhone || currentUser?.phoneNumber || "");
      const res = await fetch(`/api/recruiter/shows?showId=${showId}&phone=${phoneParam}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShows((prev) => prev.filter((s) => s.id !== showId));
        toast.success("Show roster deleted");
      }
    } catch (_) {
      toast.error("Could not delete show.");
    }
  };

  const toggleRole = (r) => {
    if (selectedRoles.includes(r)) {
      setSelectedRoles(selectedRoles.filter((x) => x !== r));
    } else {
      setSelectedRoles([...selectedRoles, r]);
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Loading show rosters...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const allAvailableRoles = [
    "Sound",
    "Lighting",
    "Rigging and staging",
    "Camera",
    "Direction and production",
    "Art and set",
    "LED and video walls",
    "Photo and video",
    "SFX",
  ];

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
                    {shows.length} shows planned
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight">
                  {isMalayalam ? "ഈ ഇവന്റിലെ ക്രൂ പട്ടിക" : "Crew For This Show"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {isMalayalam
                    ? "ഓരോ ഇവന്റിലേക്കും ആവശ്യമായ എല്ലാ ഡിപ്പാർട്ട്‌മെന്റ് ക്രൂവിനെയും സംഘടിപ്പിക്കുക."
                    : "Plan full event crews by organizing Sound, Lighting, Camera, and Stage technicians per event."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <LanguageToggle compact />
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {isMalayalam ? "പുതിയ ഇവന്റ് ചേർക്കുക" : "Create Show Roster"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-6">
          {/* Important Clarity Notice */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
            <div>
              <strong>Organizational Roster Notice:</strong> A show list is a planning workspace for your event team. Adding technicians to a show list does not constitute a confirmed booking until availability is requested and accepted.
            </div>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
              {error}
            </div>
          )}

          {shows.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {isMalayalam ? "ഇവന്റുകൾ ഒന്നും തയ്യാറാക്കിയിട്ടില്ല" : "No Shows Planned Yet"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isMalayalam
                  ? "ഒരു ഇവന്റ് ആരംഭിച്ച് ശബ്ദം, വെളിച്ചം, ക്യാമറ തുടങ്ങിയ വിവിധ വിഭാഗങ്ങളിലെ ക്രൂവിനെ ചേർക്കുക."
                  : "Create an event roster like 'Kochi Music Festival' and group technicians by department."}
              </p>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
              >
                Create First Show Roster
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {shows.map((show) => {
                const showRoles = show.roles || ["Sound", "Lighting", "Stage"];
                const crewSlots = show.crewSlots || [];

                return (
                  <div
                    key={show.id}
                    className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{show.title}</h2>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1">
                          {show.date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                              {show.date}
                            </span>
                          )}
                          {show.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-primary" />
                              {show.location}
                            </span>
                          )}
                          <span>{showRoles.length} Departments</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm" className="text-xs">
                          <Link href={`/organizer/search?city=${encodeURIComponent(show.location || "")}`}>
                            <Search className="w-3.5 h-3.5 mr-1" />
                            Find Crew for this Event
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteShow(show.id)}
                          className="text-destructive hover:bg-destructive/10 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Department Roster Groups */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {showRoles.map((r, i) => {
                        const slotsInRole = crewSlots.filter((s) => s.role === r);

                        return (
                          <div
                            key={i}
                            className="bg-muted/40 border border-border rounded-xl p-4 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                                  {r}
                                </span>
                                <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                  {slotsInRole.length} slotted
                                </span>
                              </div>

                              {slotsInRole.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground py-4 italic">
                                  No technician slotted yet
                                </p>
                              ) : (
                                <div className="space-y-1.5 py-1">
                                  {slotsInRole.map((slot, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className="text-xs font-medium text-foreground bg-card p-2 rounded border border-border"
                                    >
                                      {slot.name}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <Link
                              href={`/organizer/search?role=${encodeURIComponent(r)}&city=${encodeURIComponent(show.location || "")}`}
                              className="text-[11px] text-primary hover:underline font-semibold block pt-3 border-t border-border/50 text-center"
                            >
                              + Assign {r} Crew
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ── CREATE SHOW MODAL ─────────────────────────────────────────────── */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold mb-1">Create Event Roster</h3>
              <p className="text-xs text-muted-foreground mb-5">
                Set up an event and select the technician roles you plan to hire.
              </p>

              <form onSubmit={handleCreateShow} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Event / Show Name *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Kochi Music Festival"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="bg-muted text-sm"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Event Date</label>
                    <Input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="bg-muted text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">City / Venue</label>
                    <Input
                      type="text"
                      placeholder="e.g. Kochi"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="bg-muted text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-2">
                    Department Roles Needed
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allAvailableRoles.map((r) => {
                      const selected = selectedRoles.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => toggleRole(r)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary font-semibold"
                              : "bg-muted text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
                  >
                    {creating ? "Creating..." : "Save Show Roster"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

