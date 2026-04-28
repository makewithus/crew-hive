"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { promoteToAdmin } from "@/lib/firestore";
import Link from "next/link";

const ROLE_LABELS = {
  crew: {
    label: "Crew",
    color: "text-primary bg-primary/10 border-primary/20",
  },
  organizer: {
    label: "Organizer",
    color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  },
  admin: {
    label: "Admin",
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
  super_admin: {
    label: "Super Admin",
    color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  },
};

export default function SuperAdminUsersPage() {
  const { currentUser, isSuperAdmin, loading, logout } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState({});
  const [fetchError, setFetchError] = useState(null);

  const fetchUsers = useCallback(async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
        setFetchError(null);
      } else {
        setFetchError(json.error);
      }
    } catch (err) {
      setFetchError(err.message);
    }
  }, [currentUser]);

  useEffect(() => {
    if (loading) return;
    if (!currentUser) {
      router.push("/auth/phone");
      return;
    }
    if (!isSuperAdmin) {
      router.push("/");
      return;
    }

    fetchUsers();
    // Poll every 10s for real-time-like updates
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  }, [loading, currentUser, isSuperAdmin, router, fetchUsers]);

  const handleAction = async (uid, action, userRole) => {
    setActionLoading((prev) => ({ ...prev, [uid]: action }));
    try {
      if (action === "approve" || action === "revoke") {
        const token = await currentUser.getIdToken();
        await fetch("/api/admin/approve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: uid,
            role: userRole || "crew",
            action: action === "approve" ? "approve" : "reject",
          }),
        });
      } else if (action === "promote") {
        await promoteToAdmin(uid);
      }
      await fetchUsers();
    } catch (err) {
      console.error("[SuperAdmin] handleAction error:", err);
    }
    setActionLoading((prev) => ({ ...prev, [uid]: null }));
  };

  const filtered = users.filter((u) => {
    if (u.role === "super_admin") return false;
    const matchSearch =
      !search ||
      u.phone?.includes(search) ||
      u.id?.includes(search) ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.company?.toLowerCase().includes(search.toLowerCase()) ||
      u.city?.toLowerCase().includes(search.toLowerCase()) ||
      u.crewRole?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "pending" && u.approved === false) ||
      (filter === "approved" && u.approved === true) ||
      (filter === "crew" && u.role === "crew") ||
      (filter === "organizer" && u.role === "organizer");
    return matchSearch && matchFilter;
  });

  const pendingCount = users.filter(
    (u) => u.approved === false && u.role !== "super_admin",
  ).length;

  const FILTERS = [
    { key: "all", label: "All" },
    {
      key: "pending",
      label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}`,
    },
    { key: "approved", label: "Approved" },
    { key: "crew", label: "Crew" },
    { key: "organizer", label: "Organizers" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/super-admin/dashboard"
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="text-primary-foreground font-bold text-sm">
                  C
                </span>
              </div>
              <span className="text-lg font-bold text-foreground">
                CrewHive
              </span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">
              User Management
            </span>
          </div>
          <button
            onClick={async () => {
              await logout();
              router.push("/");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {fetchError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            Error loading users: {fetchError}{" "}
            <button onClick={fetchUsers} className="underline ml-2">
              Retry
            </button>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              User Management
            </h1>
            <p className="text-muted-foreground">
              Approve, revoke or promote registered users
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-4 py-2.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-sm font-bold text-yellow-400">
                {pendingCount} awaiting approval
              </span>
            </div>
          )}
          <button
            onClick={fetchUsers}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name, company, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border text-foreground placeholder:text-muted-foreground rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  filter === f.key
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    User
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Role
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Registered
                  </th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const name = u.name || u.company || "—";
                    const phone = u.phone || u.phoneNumber || `+${u.id}`;
                    const crewRole = u.crewRole;
                    const city = u.city;
                    const roleInfo = ROLE_LABELS[u.role] || {
                      label: u.role || "Unknown",
                      color: "text-muted-foreground bg-muted border-border",
                    };
                    const isApproved = u.approved === true;
                    const isPending = u.approved === false;
                    const busy = actionLoading[u.id];
                    const registeredAt = u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—";

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        {/* User */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-primary">
                                {name !== "—" ? name[0].toUpperCase() : "?"}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {name}
                              </p>
                              {u.company && u.company !== name && (
                                <p className="text-xs text-muted-foreground">
                                  {u.company}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {phone}
                              </p>
                              {city && (
                                <p className="text-xs text-muted-foreground">
                                  {city}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleInfo.color}`}
                          >
                            {roleInfo.label}
                          </span>
                          {crewRole &&
                            crewRole !== u.role &&
                            crewRole !== "organizer" &&
                            crewRole !== "crew" && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {crewRole}
                              </p>
                            )}
                          {u.experience && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {u.experience}
                              {u.ratePerDay ? ` · ₹${u.ratePerDay}/day` : ""}
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                              Pending
                            </span>
                          ) : isApproved ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-400/10 border border-green-400/20 text-green-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted border border-border text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>

                        {/* Registered */}
                        <td className="px-5 py-4">
                          <span className="text-xs text-muted-foreground">
                            {registeredAt}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <button
                                disabled={!!busy}
                                onClick={() =>
                                  handleAction(u.id, "approve", u.role)
                                }
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50"
                              >
                                {busy === "approve" ? "…" : "Approve"}
                              </button>
                            )}
                            {isApproved && u.role !== "admin" && (
                              <>
                                <button
                                  disabled={!!busy}
                                  onClick={() => handleAction(u.id, "promote")}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50"
                                >
                                  {busy === "promote" ? "…" : "Make Admin"}
                                </button>
                                <button
                                  disabled={!!busy}
                                  onClick={() =>
                                    handleAction(u.id, "revoke", u.role)
                                  }
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                                >
                                  {busy === "revoke" ? "…" : "Revoke"}
                                </button>
                              </>
                            )}
                            {!isPending && !isApproved && (
                              <button
                                disabled={!!busy}
                                onClick={() =>
                                  handleAction(u.id, "approve", u.role)
                                }
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all disabled:opacity-50"
                              >
                                {busy === "approve" ? "…" : "Grant Access"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          {filtered.length} user{filtered.length !== 1 ? "s" : ""} shown ·
          Updates in real-time
        </p>
      </div>
    </div>
  );
}
