"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getApprovedCrew, createBooking } from "@/lib/firestore";

const CREW_ROLES = [
  "All Roles",
  "Cinematographer",
  "Photographer",
  "Sound Engineer",
  "Lighting Operator",
  "Assistant Director",
  "Production Assistant",
  "Editor",
  "Drone Pilot",
  "Grip",
  "Gaffer",
];

const CITIES = [
  "All Cities",
  "Kochi",
  "Trivandrum",
  "Kozhikode",
  "Thrissur",
  "Kannur",
  "Kottayam",
  "Malappuram",
  "Palakkad",
  "Alappuzha",
];

export default function EmployerDashboard() {
  const {
    isAuthenticated,
    userRole,
    userApproved,
    userPhone,
    loading,
    logout,
  } = useAuth();
  const router = useRouter();
  const [crew, setCrew] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [filterRole, setFilterRole] = useState("All Roles");
  const [filterCity, setFilterCity] = useState("All Cities");
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [bookingModal, setBookingModal] = useState(null); // crew member being booked
  const [jobDetails, setJobDetails] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Auth guard
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) router.push("/login");
      else if (userRole && userRole !== "employer") router.push("/");
      else if (userRole === "employer" && !userApproved)
        router.push("/crew/verify");
    }
  }, [loading, isAuthenticated, userRole, userApproved, router]);

  const loadCrew = useCallback(async () => {
    setFetching(true);
    try {
      const filters = {};
      if (filterRole !== "All Roles") filters.role = filterRole;
      if (filterCity !== "All Cities") filters.city = filterCity;
      if (filterAvailable) filters.available = true;
      const result = await getApprovedCrew(filters);
      if (result.success) setCrew(result.data);
    } catch (err) {
      console.error("[EmployerDashboard] loadCrew error:", err);
    } finally {
      setFetching(false);
    }
  }, [filterRole, filterCity, filterAvailable]);

  useEffect(() => {
    if (isAuthenticated && userRole === "employer" && userApproved) {
      loadCrew();
    }
  }, [loadCrew, isAuthenticated, userRole, userApproved]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleBook = async () => {
    if (!bookingModal || !jobDetails.trim()) return;
    setBookingLoading(true);
    try {
      const result = await createBooking({
        crewId: bookingModal.id,
        employerId: userPhone?.replace(/\D/g, "") || "",
        crewName: bookingModal.name,
        jobDetails: jobDetails.trim(),
      });
      if (result.success) {
        showToast(`Booking request sent to ${bookingModal.name}!`);
        setBookingModal(null);
        setJobDetails("");
      } else {
        showToast(result.error || "Failed to send booking.", "error");
      }
    } catch (err) {
      showToast(err.message || "Error sending booking.", "error");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-zinc-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border
          ${toast.type === "error" ? "bg-red-900/80 border-red-700 text-red-200" : "bg-green-900/80 border-green-700 text-green-200"}`}
        >
          {toast.msg}
        </div>
      )}

      {/* Booking modal */}
      {bookingModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 px-4">
          <div className="bg-[#1A1A1A] border border-zinc-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-semibold text-lg mb-1">
              Book {bookingModal.name}
            </h2>
            <p className="text-zinc-400 text-sm mb-4">
              {bookingModal.role} · {bookingModal.city}
            </p>
            <textarea
              value={jobDetails}
              onChange={(e) => setJobDetails(e.target.value)}
              placeholder="Describe the job: event type, date, duration, location..."
              rows={4}
              className="w-full bg-[#242424] border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#F5A623] placeholder-zinc-600"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setBookingModal(null);
                  setJobDetails("");
                }}
                className="flex-1 py-2 text-sm border border-zinc-700 text-zinc-300 hover:border-zinc-500 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBook}
                disabled={bookingLoading || !jobDetails.trim()}
                className="flex-1 py-2 text-sm bg-[#F5A623] hover:bg-[#E8960F] disabled:opacity-50 text-black font-semibold rounded-xl transition-colors"
              >
                {bookingLoading ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#F5A623] rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-xs">CH</span>
          </div>
          <span className="text-white font-semibold">CrewHive</span>
        </div>
        <button
          onClick={logout}
          className="text-zinc-400 hover:text-white text-sm transition-colors"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Find Crew</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Browse approved crew members available for hire
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-[#1A1A1A] border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F5A623]"
          >
            {CREW_ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>

          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="bg-[#1A1A1A] border border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#F5A623]"
          >
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <button
            onClick={() => setFilterAvailable(!filterAvailable)}
            className={`px-4 py-2 text-sm rounded-xl border transition-colors ${
              filterAvailable
                ? "bg-[#F5A623]/20 border-[#F5A623]/50 text-[#F5A623]"
                : "bg-[#1A1A1A] border-zinc-700 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            Available now
          </button>
        </div>

        {/* Grid */}
        {fetching ? (
          <div className="text-zinc-400 text-sm py-12 text-center">
            Loading crew...
          </div>
        ) : crew.length === 0 ? (
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-12 text-center">
            <p className="text-white font-medium mb-1">No crew found</p>
            <p className="text-zinc-400 text-sm">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {crew.map((member) => (
              <div
                key={member.id}
                className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3"
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#F5A623]/20 border border-[#F5A623]/30 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-[#F5A623] font-semibold">
                      {(member.name || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm truncate">
                      {member.name}
                    </h3>
                    <p className="text-zinc-400 text-xs">{member.role}</p>
                  </div>
                  {member.available && (
                    <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full shrink-0">
                      Available
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="text-zinc-400 text-xs space-y-1">
                  {member.city && <p>📍 {member.city}</p>}
                  {member.experience && <p>⏱ {member.experience}</p>}
                </div>

                {/* Book button */}
                <button
                  onClick={() => setBookingModal(member)}
                  className="w-full mt-auto py-2 text-sm bg-[#F5A623]/10 hover:bg-[#F5A623]/20 border border-[#F5A623]/30 text-[#F5A623] rounded-xl transition-colors font-medium"
                >
                  Book Now
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
