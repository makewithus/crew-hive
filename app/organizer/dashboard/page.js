"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  getApprovedCrew,
  getOrganizerBookings,
  updateBooking,
} from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/utils/formatting";
import { USER_ROLES } from "@/utils/constants";
import {
  CalendarDays,
  ClipboardList,
  MapPin,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

export default function OrganizerDashboardPage() {
  const { currentUser, userPhone } = useAuth();
  const router = useRouter();
  const [organizer, setOrganizer] = useState(null);
  const [stats, setStats] = useState({
    totalCrew: 0,
    availableCrew: 0,
    totalBookings: 0,
  });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [showBookings, setShowBookings] = useState(false);
  const [error, setError] = useState("");
  const bookingsRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [currentUser, userPhone]);

  const loadData = async ({ showPageLoader = true } = {}) => {
    if (!currentUser || !userPhone) return;
    if (showPageLoader) setLoading(true);
    setError("");

    try {
      const token = await auth.currentUser?.getIdToken();
      const profileRes = await fetch(
        `/api/organizer/profile?phone=${encodeURIComponent(userPhone)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const orgResult = await profileRes.json();
      if (orgResult.success) {
        setOrganizer(orgResult.data);
      } else {
        setError("Profile not found. Please complete your setup.");
        setTimeout(() => router.push("/organizer/setup"), 2000);
        return;
      }

      const [crewResult, bookingsResult] = await Promise.all([
        getApprovedCrew(),
        getOrganizerBookings(userPhone),
      ]);

      if (!crewResult.success) {
        setError(crewResult.error || "Failed to load crew statistics");
        return;
      }

      if (!bookingsResult.success) {
        setError(bookingsResult.error || "Failed to load bookings");
        return;
      }

      const availableCrew = crewResult.data.filter((c) => c.available).length;
      const organizerBookings = [...bookingsResult.data].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      );
      setBookings(organizerBookings);
      setStats({
        totalCrew: crewResult.data.length,
        availableCrew,
        totalBookings: organizerBookings.length,
      });
    } catch (err) {
      console.error("[v0] Load error:", err);
      setError(err.message);
    } finally {
      if (showPageLoader) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData({ showPageLoader: false });
    setRefreshing(false);
  };

  const scrollToBookings = () => {
    bookingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const revealBookings = () => {
    setShowBookings(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToBookings);
    });
  };

  const handleCancelBooking = async (bookingId) => {
    setCancellingId(bookingId);
    setError("");
    try {
      const result = await updateBooking(bookingId, { status: "cancelled" });
      if (!result.success) {
        setError(result.error || "Failed to cancel booking");
        return;
      }
      await loadData({ showPageLoader: false });
    } catch (err) {
      console.error("[organizer/dashboard] Cancel booking error:", err);
      setError(err.message || "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
        <Header />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-foreground font-medium">Loading...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={USER_ROLES.ORGANIZER}>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {organizer?.name || "Organizer"}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">
                Total Crew Available
              </p>
              <p className="text-4xl font-bold text-foreground mt-2">
                {stats.totalCrew}
              </p>
              <p className="text-sm text-primary mt-2">
                {stats.availableCrew} available now
              </p>
            </div>
            <button
              type="button"
              onClick={revealBookings}
              className="p-6 bg-card border border-border rounded-lg text-left transition-colors hover:border-primary/60 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background cursor-pointer"
            >
              <p className="text-muted-foreground text-sm">Your Bookings</p>
              <p className="text-4xl font-bold text-primary mt-2">
                {stats.totalBookings}
              </p>
            </button>
            <div className="p-6 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Organization</p>
              <p className="text-lg font-bold text-foreground mt-2">
                {organizer?.companyName}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg">
                <Link href="/organizer/search">
                  <Search className="h-5 w-5" />
                  Search for Crew
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={revealBookings}
                className="w-full border-border text-foreground hover:bg-muted hover:text-foreground py-6 text-lg"
              >
                <ClipboardList className="h-5 w-5" />
                View My Bookings
              </Button>
            </div>
          </div>

          {showBookings && (
            <section ref={bookingsRef} className="mt-12 scroll-mt-24">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    My Bookings
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    All past, present, pending, accepted, rejected, and cancelled bookings.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="border-border text-foreground hover:bg-muted hover:text-foreground"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Refreshing" : "Refresh"}
                </Button>
              </div>

              {bookings.length === 0 ? (
                <div className="border border-border bg-card rounded-lg p-8 text-center">
                  <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium text-foreground">No bookings yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    When you request crew, those bookings will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-card border border-border rounded-lg p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <p className="font-bold text-foreground">
                              {booking.crewName || `Crew ${booking.crewId}`}
                            </p>
                            <StatusBadge status={booking.status} type="booking" />
                          </div>
                          <div className="grid gap-2 text-sm text-muted-foreground">
                            {booking.date && (
                              <span className="inline-flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-primary" />
                                {formatDate(booking.date)}
                              </span>
                            )}
                            {booking.location && (
                              <span className="inline-flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                {booking.location}
                              </span>
                            )}
                            {booking.notes && (
                              <p className="text-foreground">{booking.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                          <Button
                            asChild
                            variant="outline"
                            className="border-border text-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Link href={`/organizer/crew/${booking.crewId}`}>
                              View Crew
                            </Link>
                          </Button>
                          {booking.status === "pending" && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleCancelBooking(booking.id)}
                              disabled={cancellingId === booking.id}
                              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                            >
                              <XCircle className="h-4 w-4" />
                              {cancellingId === booking.id
                                ? "Cancelling"
                                : "Cancel"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
