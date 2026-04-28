"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToApprovedCrew } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import CrewCard from "@/components/CrewCard";
import { CREW_ROLES } from "@/utils/constants";
import { USER_ROLES } from "@/utils/constants";

export default function OrganizerSearchPage() {
  const { currentUser } = useAuth();
  const [crews, setCrew] = useState([]);
  const [filteredCrew, setFilteredCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    role: "",
    city: "",
    available: false,
  });

  // Real-time listener — crew list updates live when admin approves/rejects
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    const unsubscribe = subscribeToApprovedCrew({}, (result) => {
      if (result.success) {
        setCrew(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    applyFilters();
  }, [crews, filters]);

  const applyFilters = () => {
    let filtered = crews;

    if (filters.role) {
      filtered = filtered.filter((c) => c.role === filters.role);
    }
    if (filters.city) {
      filtered = filtered.filter((c) =>
        c.city.toLowerCase().includes(filters.city.toLowerCase()),
      );
    }
    if (filters.available) {
      filtered = filtered.filter((c) => c.available);
    }

    setFilteredCrew(filtered);
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
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
            <h1 className="text-3xl font-bold text-foreground">Search Crew</h1>
            <p className="text-muted-foreground mt-2">
              Find qualified crew members for your projects
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters */}
            <div className="bg-card border border-border rounded-lg p-6 h-fit">
              <h2 className="font-bold text-foreground mb-4">Filters</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    value={filters.role}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-2 bg-background border border-border rounded text-foreground text-sm"
                  >
                    <option value="">All roles</option>
                    {CREW_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={filters.city}
                    onChange={handleFilterChange}
                    placeholder="Search city..."
                    className="w-full px-4 py-2 bg-background border border-border rounded text-foreground text-sm"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="available"
                    checked={filters.available}
                    onChange={handleFilterChange}
                    className="rounded"
                  />
                  <span className="text-sm text-foreground">Available now</span>
                </label>

                <Button
                  onClick={() =>
                    setFilters({ role: "", city: "", available: false })
                  }
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-muted hover:text-foreground"
                >
                  Reset Filters
                </Button>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              <p className="text-muted-foreground mb-6">
                Found{" "}
                <span className="font-bold text-foreground">
                  {filteredCrew.length}
                </span>{" "}
                crew members
              </p>

              {filteredCrew.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No crew members match your filters
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredCrew.map((member) => (
                    <CrewCard key={member.id || member.phone} crew={member} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
