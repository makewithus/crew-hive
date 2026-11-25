/**
 * /app/organizer/prebookings/page.js
 * Recruiter Date Holds & Pre-bookings Management (I7 [P2])
 *
 * Implements:
 * - View date holds by status (All, Pending, Accepted, Declined, Expired, Cancelled)
 * - Request a date hold with start/end date, event, location, rate, and notes
 * - Cancel an active date hold
 * - Conflict prevention messaging
 * - Clear distinction between temporary 48h date holds and confirmed bookings
 * - Respects PRE_BOOKINGS_ENABLED feature gate
 * - Fully localized in English and Malayalam
 */

"use client";

import { apiFetch } from "@/lib/api-client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import { useLanguage } from "@/context/LanguageContext";
import { USER_ROLES } from "@/utils/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DatePicker from "@/components/DatePicker";
import {
  Calendar,
  Clock,
  MapPin,
  IndianRupee,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Info,
  CalendarCheck,
  Ban,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

export default function OrganizerPrebookingsPage() {
  const { currentUser, userPhone } = useAuth();
  const { isMalayalam } = useLanguage();

  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isFeatureDisabled, setIsFeatureDisabled] = useState(false);

  // New Hold Modal
  const [showModal, setShowModal] = useState(false);
  const [crewPhone, setCrewPhone] = useState("");
  const [eventName, setEventName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("");
  const [offeredRate, setOfferedRate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const loadHolds = useCallback(async () => {
    if (!currentUser && !userPhone) return;
    setLoading(true);
    setError("");

    try {
      const res = await apiFetch("/api/prebookings");
      const json = await res.json();

      if (res.ok && json.success) {
        setHolds(json.items || []);
        setIsFeatureDisabled(false);
      } else {
        if (json.error && json.error.toLowerCase().includes("disabled")) {
          setIsFeatureDisabled(true);
        } else {
          setError(json.error || "Failed to load date holds.");
        }
      }
    } catch (err) {
      console.error("[Prebookings] Load error:", err);
      setError(err.message || "Network error loading date holds");
    } finally {
      setLoading(false);
    }
  }, [currentUser, userPhone]);

  useEffect(() => {
    loadHolds();
  }, [loadHolds]);

  const handleCreateHold = async (e) => {
    e.preventDefault();
    if (!crewPhone || !startDate || !eventName) {
      toast.error(
        isMalayalam
          ? "ദയവായി ടെക്നീഷ്യന്റെ ഫോൺ നമ്പറും, തീയതിയും, ഇവന്റിന്റെ പേരും നൽകുക."
          : "Please provide crew phone, date, and event name."
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/prebookings", {
        method: "POST",
        body: JSON.stringify({
          crewId: crewPhone,
          date: startDate,
          endDate: endDate || startDate,
          eventName,
          location,
          notes,
          offeredRate: offeredRate ? Number(offeredRate) : null,
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(
          isMalayalam ? "തീയതി ഹോൾഡ് വിജയകരമായി അയച്ചു." : "Date hold requested successfully."
        );
        setShowModal(false);
        setCrewPhone("");
        setEventName("");
        setStartDate("");
        setEndDate("");
        setLocation("");
        setOfferedRate("");
        setNotes("");
        loadHolds();
      } else {
        toast.error(json.error || "Failed to create date hold.");
      }
    } catch (err) {
      toast.error(err.message || "Network error submitting hold");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelHold = async (holdId) => {
    if (
      !confirm(
        isMalayalam
          ? "ഈ തീയതി ഹോൾഡ് റദ്ദാക്കണമെന്ന് ഉറപ്പാണോ?"
          : "Are you sure you want to cancel this date hold?"
      )
    ) {
      return;
    }

    setCancellingId(holdId);
    try {
      const res = await apiFetch(`/api/prebookings/${holdId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(isMalayalam ? "ഹോൾഡ് റദ്ദാക്കി." : "Date hold cancelled.");
        setHolds((prev) =>
          prev.map((h) => (h.id === holdId ? { ...h, status: "cancelled" } : h))
        );
      } else {
        toast.error(json.error || "Failed to cancel hold");
      }
    } catch (err) {
      toast.error(err.message || "Network error cancelling hold");
    } finally {
      setCancellingId(null);
    }
  };

  const filteredHolds = holds.filter((h) => {
    if (activeTab === "all") return true;
    return h.status === activeTab;
  });

  return (
    <AuthGuard allowedRoles={[USER_ROLES.ORGANIZER, USER_ROLES.SUPER_ADMIN]}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
          {/* Breadcrumb / Back Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/organizer/dashboard"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {isMalayalam ? "ഡാഷ്‌ബോർഡിലേക്ക് മടങ്ങുക" : "Back to Dashboard"}
            </Link>

            <Button
              onClick={() => setShowModal(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold gap-2"
            >
              <Plus className="w-4 h-4" />
              {isMalayalam ? "പുതിയ തീയതി ഹോൾഡ്" : "Request Date Hold"}
            </Button>
          </div>

          {/* Page Heading */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {isMalayalam ? "തീയതി ഹോൾഡുകൾ & പ്രീ-ബുക്കിംഗ്" : "Date Holds & Pre-Bookings"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {isMalayalam
                    ? "ഇവന്റുകൾക്കായി ക്രൂ ടെക്നീഷ്യൻമാരുടെ തീയതികൾ 48 മണിക്കൂർ മുൻകൂട്ടി റിസർവ് ചെയ്യുക."
                    : "Temporarily reserve technician dates for upcoming productions and shows (48h soft hold)."}
                </p>
              </div>
            </div>
          </div>

          {/* Legal / Operational Distinction Notice */}
          <div className="bg-muted/40 border border-border rounded-xl p-4 mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">
                {isMalayalam
                  ? "പ്രീ-ബുക്കിംഗ് ഹോൾഡും സ്ഥിരീകരിച്ച ബുക്കിംഗും തമ്മിലുള്ള വ്യത്യാസം:"
                  : "Important distinction: Date Hold vs Confirmed Booking"}
              </p>
              <p>
                {isMalayalam
                  ? "ഒരു തീയതി ഹോൾഡ് എന്നത് ഒരു താൽക്കാലിക 48 മണിക്കൂർ സംവരണമാണ്. രണ്ട് കക്ഷികളും ഒപ്പുവെച്ച കരാറുകളോ അഡ്വാൻസ് പേയ്‌മെന്റോ ഇല്ലാതെ ഇത് അന്തിമവും നിയമപരവുമായ ബുക്കിംഗ് ആകില്ല. ക്രൂ അംഗം സ്ഥിരീകരിച്ചതിനു ശേഷം മാത്രമേ ഔദ്യോഗിക ബുക്കിംഗ് പൂർത്തിയാകൂ."
                  : "A date hold is a temporary 48-hour reservation placed with the technician. It does not constitute a final binding contract or confirmed booking until explicitly accepted by both parties. No payments or escrow are processed through the platform."}
              </p>
            </div>
          </div>

          {/* Feature Disabled Notice (if flag is false) */}
          {isFeatureDisabled && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-amber-500">
                  {isMalayalam
                    ? "പ്രീ-ബുക്കിംഗ് നിലവിൽ പൈലറ്റ് ഘട്ടത്തിലാണ് (P2 Preview)"
                    : "Pre-bookings feature is currently in commercial pilot (P2 Preview)"}
                </p>
                <p>
                  {isMalayalam
                    ? "ഈ ഫീച്ചർ ആക്റ്റീവേറ്റ് ചെയ്യുന്നതിനായി ദയവായി ക്രൂഹൈവ് അക്കൗണ്ട് മാനേജറുമായോ സപ്പോർട്ടുമായോ ബന്ധപ്പെടുക."
                    : "This feature is currently gated behind the commercial pilot flag (PRE_BOOKINGS_ENABLED). Contact support@crewhive.in to activate early access."}
                </p>
              </div>
            </div>
          )}

          {/* Status Tabs */}
          <div className="flex border-b border-border mb-6 gap-2 overflow-x-auto">
            {[
              { id: "all", labelEn: "All Holds", labelMl: "എല്ലാം" },
              { id: "pending", labelEn: "Pending (48h)", labelMl: "തീർപ്പുകൽപ്പിക്കാത്തവ" },
              { id: "accepted", labelEn: "Accepted", labelMl: "സ്വീകരിച്ചവ" },
              { id: "declined", labelEn: "Declined", labelMl: "നിരസിച്ചവ" },
              { id: "expired", labelEn: "Expired", labelMl: "കാലഹരണപ്പെട്ടവ" },
              { id: "cancelled", labelEn: "Cancelled", labelMl: "റദ്ദാക്കിയവ" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {isMalayalam ? tab.labelMl : tab.labelEn}
              </button>
            ))}
          </div>

          {/* List Content */}
          {loading ? (
            <div className="py-20 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">
                {isMalayalam ? "ഹോൾഡുകൾ ലോഡ് ചെയ്യുന്നു..." : "Loading date holds..."}
              </p>
            </div>
          ) : error ? (
            <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-xs font-medium text-destructive mb-3">{error}</p>
              <Button onClick={loadHolds} variant="outline" size="sm" className="text-xs">
                {isMalayalam ? "വീണ്ടും ശ്രമിക്കുക" : "Try Again"}
              </Button>
            </div>
          ) : filteredHolds.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border rounded-xl">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-semibold mb-1">
                {isMalayalam ? "തീയതി ഹോൾഡുകൾ ഒന്നും കണ്ടെത്തിയില്ല" : "No date holds found"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
                {isMalayalam
                  ? "നിങ്ങൾ അയച്ച തീയതി ഹോൾഡുകൾ ഇവിടെ കാണാം."
                  : "When you request a date hold for an upcoming event, it will appear here."}
              </p>
              <Button
                onClick={() => setShowModal(true)}
                size="sm"
                className="bg-primary text-primary-foreground text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {isMalayalam ? "പുതിയ തീയതി ഹോൾഡ് ചേർക്കുക" : "Request Date Hold"}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredHolds.map((hold) => {
                const isPending = hold.status === "pending";
                const isAccepted = hold.status === "accepted";
                const isDeclined = hold.status === "declined";
                const isExpired = hold.status === "expired";
                const isCancelled = hold.status === "cancelled";

                return (
                  <div
                    key={hold.id}
                    className="p-5 bg-card border border-border rounded-xl shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                              isPending
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                                : isAccepted
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                                : isDeclined
                                ? "bg-rose-500/10 text-rose-500 border border-rose-500/30"
                                : isExpired
                                ? "bg-muted text-muted-foreground border border-border"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {hold.status}
                          </span>
                          <h3 className="text-sm font-bold">{hold.eventName || "Event Hold"}</h3>
                        </div>

                        <span className="text-[11px] text-muted-foreground">
                          ID: #{hold.id.slice(-6)}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span>
                            {hold.date}
                            {hold.endDate && hold.endDate !== hold.date ? ` → ${hold.endDate}` : ""}
                          </span>
                        </div>

                        {hold.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <span>{hold.location}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          <span>
                            Crew Phone / ID: <strong>+{hold.crewId}</strong>
                          </span>
                        </div>

                        {hold.offeredRate && (
                          <div className="flex items-center gap-2">
                            <IndianRupee className="w-3.5 h-3.5 text-primary" />
                            <span>₹{Number(hold.offeredRate).toLocaleString("en-IN")} / day</span>
                          </div>
                        )}

                        {hold.notes && (
                          <p className="mt-2 text-[11px] bg-muted/30 p-2 rounded-lg italic">
                            &quot;{hold.notes}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-[11px] text-muted-foreground">
                        {isPending && hold.holdExpiresAt ? (
                          <>Expires: {new Date(hold.holdExpiresAt).toLocaleDateString()}</>
                        ) : (
                          <>Updated: {new Date(hold.updatedAt || hold.createdAt).toLocaleDateString()}</>
                        )}
                      </span>

                      {isPending && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={cancellingId === hold.id}
                          onClick={() => handleCancelHold(hold.id)}
                          className="text-destructive hover:bg-destructive/10 text-xs h-7 px-2.5 font-medium"
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          {cancellingId === hold.id
                            ? isMalayalam
                              ? "റദ്ദാക്കുന്നു..."
                              : "Cancelling..."
                            : isMalayalam
                            ? "ഹോൾഡ് റദ്ദാക്കുക"
                            : "Cancel Hold"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* New Date Hold Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">
                      {isMalayalam ? "തീയതി ഹോൾഡ് അഭ്യർത്ഥിക്കുക" : "Request Date Hold"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isMalayalam
                        ? "48 മണിക്കൂർ നേരത്തേക്ക് ക്രൂ തീയതി റിസർവ് ചെയ്യുക"
                        : "Hold a technician's calendar for 48 hours"}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateHold} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {isMalayalam ? "ക്രൂ ഫോൺ നമ്പർ / ഐഡി *" : "Crew Phone Number / ID *"}
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. 919876543201"
                      value={crewPhone}
                      onChange={(e) => setCrewPhone(e.target.value)}
                      required
                      className="text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {isMalayalam
                        ? "ടെക്നീഷ്യന്റെ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക"
                        : "Enter the technician's 10-digit mobile number with or without country code"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {isMalayalam ? "ഇവന്റ് / പ്രൊഡക്ഷൻ പേര് *" : "Event / Show Name *"}
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Kochi Concert 2027 / Wedding Shoot"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        {isMalayalam ? "ആരംഭ തീയതി *" : "Start Date *"}
                      </label>
                      <DatePicker
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        {isMalayalam ? "അവസാന തീയതി" : "End Date (Optional)"}
                      </label>
                      <DatePicker
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || new Date().toISOString().split("T")[0]}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        {isMalayalam ? "ലൊക്കേഷൻ" : "Location"}
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Kochi / Trivandrum"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        {isMalayalam ? "വാഗ്ദാനം ചെയ്ത നിരക്ക് (₹/day)" : "Offered Rate (₹/day)"}
                      </label>
                      <Input
                        type="number"
                        placeholder="e.g. 5000"
                        value={offeredRate}
                        onChange={(e) => setOfferedRate(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {isMalayalam ? "പ്രത്യേക കുറിപ്പുകൾ" : "Notes / Shift Details"}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={
                        isMalayalam
                          ? "ഷിഫ്റ്റ് സമയം, ഉപകരണങ്ങൾ, ലൊക്കേഷൻ വിശദാംശങ്ങൾ..."
                          : "Shift timings, gear requirements, shoot schedule..."
                      }
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="pt-3 border-t border-border flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowModal(false)}
                      className="flex-1 text-xs"
                    >
                      {isMalayalam ? "റദ്ദാക്കുക" : "Cancel"}
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
                    >
                      {submitting
                        ? isMalayalam
                          ? "അഭ്യർത്ഥിക്കുന്നു..."
                          : "Requesting..."
                        : isMalayalam
                        ? "ഹോൾഡ് അയയ്ക്കുക"
                        : "Submit Date Hold"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
