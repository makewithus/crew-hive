"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  updateCrewProfile,
  subscribeToCrewProfile,
  subscribeToCrewBookings,
} from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import AvailabilityToggle from "@/components/AvailabilityToggle";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import { USER_ROLES } from "@/utils/constants";
import { User } from "lucide-react";

export default function CrewDashboardPage() {
  const { currentUser, userPhone } = useAuth();
  const router = useRouter();
  const [crew, setCrew] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  // Real-time listeners — update instantly without page refresh
  useEffect(() => {
    if (!currentUser || !userPhone) return;
    setLoading(true);

    const unsubCrew = subscribeToCrewProfile(userPhone, (result) => {
      if (result.success) {
        setCrew(result.data);
        setLoading(false);
      } else {
        setError("Profile not found. Please complete your setup.");
        setLoading(false);
        setTimeout(() => router.push("/crew/setup"), 2000);
      }
    });

    const unsubBookings = subscribeToCrewBookings(userPhone, (result) => {
      if (result.success) setBookings(result.data);
    });

    return () => {
      unsubCrew();
      unsubBookings();
    };
  }, [currentUser, userPhone]);

  const handleAvailabilityChange = async (newStatus) => {
    if (!crew) return;
    setUpdating(true);
    setError("");

    try {
      console.log("[v0] Updating availability:", newStatus);
      const result = await updateCrewProfile(userPhone, {
        available: newStatus,
      });

      if (result.success) {
        setCrew((prev) => ({ ...prev, available: newStatus }));
      } else {
        setError(result.error || "Failed to update availability");
      }
    } catch (err) {
      console.error("[v0] Update error:", err);
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getProfileCompletion = () => {
    if (!crew) return 0;
    const fields = [
      crew.name,
      crew.role,
      crew.experience,
      crew.city,
      crew.travelRange,
      crew.ratePerDay,
      crew.bio,
      crew.profileImage,
    ];
    const completed = fields.filter((f) => f && f !== "").length;
    return Math.round((completed / fields.length) * 100);
  };

  const getBookingStats = () => {
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      accepted: bookings.filter((b) => b.status === "accepted").length,
    };
  };

  if (loading) {
    return (
      <AuthGuard requiredRole={USER_ROLES.CREW}>
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

  const stats = getBookingStats();
  const completion = getProfileCompletion();

  return (
    <AuthGuard requiredRole={USER_ROLES.CREW}>
      <Header />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {crew?.name || "Crew Member"}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {/* Profile Card */}
          <div className="flex items-center gap-5 mb-10 p-6 bg-card border border-border rounded-lg">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center shrink-0">
              {crew?.profileImage ? (
                <img
                  src={crew.profileImage}
                  alt={crew.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-9 h-9 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">
                {crew?.name}
              </h2>
              <p className="text-primary text-sm font-medium">{crew?.role}</p>
              <p className="text-muted-foreground text-sm">
                {crew?.city}
                {crew?.experience ? ` · ${crew.experience}` : ""}
              </p>
            </div>
            <Link href="/crew/setup">
              <Button
                variant="outline"
                className="border-border text-foreground hover:bg-muted hover:text-foreground shrink-0"
              >
                Edit Profile
              </Button>
            </Link>
          </div>
          {/* Availability + Completion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Availability Card */}
            <div className="p-6 bg-card border border-border rounded-lg">
              <h2 className="text-lg font-bold text-foreground mb-6">
                Availability Status
              </h2>
              <AvailabilityToggle
                isAvailable={crew?.available || false}
                onChange={handleAvailabilityChange}
                loading={updating}
              />
              <p className="text-sm text-muted-foreground mt-4">
                When you're available, organizers can book you for projects
              </p>
            </div>

            {/* Profile Completion */}
            <div className="p-6 bg-card border border-border rounded-lg">
              <h2 className="text-lg font-bold text-foreground mb-4">
                Profile Completion
              </h2>
              <div className="mb-4">
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{ width: `${completion}%` }}
                  ></div>
                </div>
              </div>
              <p className="text-2xl font-bold text-primary">{completion}%</p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete your profile to get more bookings
              </p>
              <Link href="/crew/setup">
                <Button className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Total Bookings</p>
              <p className="text-4xl font-bold text-foreground mt-2">
                {stats.total}
              </p>
            </div>
            <div className="p-6 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Pending Requests</p>
              <p className="text-4xl font-bold text-primary mt-2">
                {stats.pending}
              </p>
            </div>
            <div className="p-6 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm">Accepted</p>
              <p className="text-4xl font-bold text-green-600 mt-2">
                {stats.accepted}
              </p>
            </div>
          </div>

          {/* Approval Status */}
          {crew?.status === "pending" && (
            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg mb-8">
              <h3 className="font-bold text-yellow-900 mb-2">
                Pending Approval
              </h3>
              <p className="text-yellow-800 text-sm">
                Your profile is under review by our admin team. You'll be
                notified once approved.
              </p>
            </div>
          )}

          {crew?.status === "rejected" && (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg mb-8">
              <h3 className="font-bold text-red-900 mb-2">Approval Rejected</h3>
              <p className="text-red-800 text-sm">
                Your profile was not approved. Please contact support for more
                information.
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/crew/requests">
                <Button
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-muted hover:text-foreground"
                >
                  View Requests ({stats.pending})
                </Button>
              </Link>
              <Link href="/crew/verify">
                <Button
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-muted hover:text-foreground"
                >
                  Verification
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
