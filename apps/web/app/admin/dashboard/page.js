/**
 * /app/admin/dashboard/page.js
 * Complete CrewHive Administration Portal
 *
 * Implements Prompt 3 Sections 15 & 16:
 * - 15A. Profile Management & Approvals (Approve, Reject, Hide/Unhide, Edit Classification)
 * - 15B. Report Moderation Queue (Review, Mark Resolved, Hide Profile, Audit log)
 * - 15C. Role Taxonomy Management (10 Parent Roles, Specialisations, EN/ML labels, Icons, Sort Order)
 * - 15D. City & District Management (Supported cities, launch hubs)
 * - 15E. Genuine Metrics Dashboard (Signups by city, Signups by role, Active availability, Requests, Replies)
 * - 16. Association Administration & CSV Member Import (Validation, Duplicate detection, Preview, Execution)
 */

"use client";

import { apiFetch } from "@/lib/api-client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/StatusBadge";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/context/LanguageContext";
import { formatDate } from "@/utils/formatting";
import { USER_ROLES } from "@/utils/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  Users,
  Flag,
  Sliders,
  MapPin,
  Building,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Edit3,
  Download,
  Plus,
  Trash2,
  FileText,
  AlertTriangle,
  Send,
  Link as LinkIcon,
  Search,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const { currentUser, userRole, isAdmin, isSuperAdmin, logout } = useAuth();
  const router = useRouter();
  const { isMalayalam } = useLanguage();

  // Active Navigation Tab
  // "metrics" | "profiles" | "reports" | "roles" | "cities" | "associations"
  const [activeTab, setActiveTab] = useState("metrics");

  // ── Metrics State ─────────────────────────────────────────────────────────
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // ── Profiles State ────────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState([]);
  const [profileFilter, setProfileFilter] = useState("all"); // all, pending, approved, hidden
  const [profileLoading, setProfileLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);

  // Lock body scroll when editing modal is open
  useEffect(() => {
    if (editingProfile) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [editingProfile]);
  const [editRoleVal, setEditRoleVal] = useState("");
  const [editCityVal, setEditCityVal] = useState("");

  // ── Reports State ─────────────────────────────────────────────────────────
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // ── Taxonomy Roles State ──────────────────────────────────────────────────
  const [rolesList, setRolesList] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [newRoleNameEn, setNewRoleNameEn] = useState("");
  const [newRoleNameMl, setNewRoleNameMl] = useState("");

  // ── Cities State ──────────────────────────────────────────────────────────
  const [citiesList, setCitiesList] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [newCityEn, setNewCityEn] = useState("");
  const [newCityMl, setNewCityMl] = useState("");

  // ── Associations State ────────────────────────────────────────────────────
  const [associations, setAssociations] = useState([]);
  const [assocLoading, setAssocLoading] = useState(false);
  const [newAssocName, setNewAssocName] = useState("");
  const [newAssocCode, setNewAssocCode] = useState("");
  const [creatingAssoc, setCreatingAssoc] = useState(false);

  // ── CSV Import State ──────────────────────────────────────────────────────
  const [selectedAssocForImport, setSelectedAssocForImport] = useState("");
  const [csvFileContent, setCsvFileContent] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvPreview, setCsvPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Load Initial Data based on active tab
  useEffect(() => {
    if (activeTab === "metrics") loadMetrics();
    else if (activeTab === "profiles") loadProfiles();
    else if (activeTab === "reports") loadReports();
    else if (activeTab === "roles") loadRoles();
    else if (activeTab === "cities") loadCities();
    else if (activeTab === "associations") loadAssociations();
  }, [activeTab, profileFilter]);

  // ── 1. Load Genuine Metrics ───────────────────────────────────────────────
  const loadMetrics = async () => {
    setMetricsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await apiFetch("/api/admin/metrics", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) setMetrics(json.data);
    } catch (err) {
      toast.error("Failed to load metrics");
    } finally {
      setMetricsLoading(false);
    }
  };

  // ── 2. Load Profiles ──────────────────────────────────────────────────────
  const loadProfiles = async () => {
    setProfileLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await apiFetch(`/api/admin/profiles?filter=${profileFilter}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) setProfiles(json.data || []);
    } catch (_) {
      toast.error("Failed to load profiles");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileApproval = async (id, action) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await apiFetch("/api/admin/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        loadProfiles();
      } else {
        toast.error(json.error || "Action failed");
      }
    } catch (_) {
      toast.error("Network error");
    }
  };

  const handleToggleHide = async (id) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await apiFetch("/api/admin/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id, action: "toggle_hide" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        loadProfiles();
      }
    } catch (_) {
      toast.error("Network error");
    }
  };

  const handleSaveClassification = async () => {
    if (!editingProfile) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await apiFetch("/api/admin/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: editingProfile.id,
          action: "update_classification",
          updates: { role: editRoleVal, city: editCityVal },
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Classification updated");
        setEditingProfile(null);
        loadProfiles();
      }
    } catch (_) {
      toast.error("Update failed");
    }
  };

  // ── 3. Load Reports ───────────────────────────────────────────────────────
  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await apiFetch("/api/admin/reports", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) setReports(json.data || []);
    } catch (_) {
      toast.error("Failed to load reports");
    } finally {
      setReportsLoading(false);
    }
  };

  const handleResolveReport = async (reportId, moderationAction) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await apiFetch("/api/admin/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "resolve",
          reportId,
          moderationAction,
          moderationNotes: `Moderation action "${moderationAction}" applied by admin.`,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        loadReports();
      }
    } catch (_) {
      toast.error("Error resolving report");
    }
  };

  // ── 4. Load & Manage Roles ────────────────────────────────────────────────
  const loadRoles = async () => {
    setRolesLoading(true);
    try {
      const res = await apiFetch("/api/taxonomy/roles");
      const json = await res.json();
      if (json.success) setRolesList(json.data || []);
    } catch (_) {
      toast.error("Failed to load roles");
    } finally {
      setRolesLoading(false);
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRoleNameEn.trim()) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const roleId = newRoleNameEn.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const res = await apiFetch("/api/taxonomy/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          role: {
            id: roleId,
            nameEn: newRoleNameEn.trim(),
            nameMl: newRoleNameMl.trim() || newRoleNameEn.trim(),
            sortOrder: rolesList.length + 1,
            specialisations: [],
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Role "${newRoleNameEn}" added.`);
        setNewRoleNameEn("");
        setNewRoleNameMl("");
        loadRoles();
      }
    } catch (_) {
      toast.error("Could not add role");
    }
  };

  // ── 5. Load & Manage Cities ───────────────────────────────────────────────
  const loadCities = async () => {
    setCitiesLoading(true);
    try {
      const res = await apiFetch("/api/taxonomy/cities");
      const json = await res.json();
      if (json.success) setCitiesList(json.data || []);
    } catch (_) {
      toast.error("Failed to load cities");
    } finally {
      setCitiesLoading(false);
    }
  };

  const handleAddCity = async (e) => {
    e.preventDefault();
    if (!newCityEn.trim()) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const cityId = newCityEn.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const res = await apiFetch("/api/taxonomy/cities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          city: {
            id: cityId,
            nameEn: newCityEn.trim(),
            nameMl: newCityMl.trim() || newCityEn.trim(),
            isLaunchCity: false,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`City "${newCityEn}" added.`);
        setNewCityEn("");
        setNewCityMl("");
        loadCities();
      }
    } catch (_) {
      toast.error("Could not add city");
    }
  };

  // ── 6. Load & Manage Associations ─────────────────────────────────────────
  const loadAssociations = async () => {
    setAssocLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await apiFetch("/api/admin/associations", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) {
        const list = json.data || [];
        setAssociations(list);
        if (list.length > 0 && !selectedAssocForImport) {
          setSelectedAssocForImport(list[0].id);
        } else if (list.length === 0) {
          try {
            const createRes = await apiFetch("/api/admin/associations", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                name: "FEFKA Directors Union",
                code: "FEFKA2026",
              }),
            });
            const created = await createRes.json();
            if (created.success && created.data) {
              setAssociations([created.data]);
              setSelectedAssocForImport(created.data.id);
            }
          } catch (_) {}
        }
      }
    } catch (_) {
      toast.error("Failed to load associations");
    } finally {
      setAssocLoading(false);
    }
  };

  const handleCreateAssociation = async (e) => {
    e.preventDefault();
    if (!newAssocName.trim() || !newAssocCode.trim()) return;
    setCreatingAssoc(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await apiFetch("/api/admin/associations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newAssocName.trim(),
          code: newAssocCode.trim().toUpperCase(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Association "${newAssocName}" registered!`);
        setNewAssocName("");
        setNewAssocCode("");
        loadAssociations();
      } else {
        toast.error(json.error || "Failed to create association.");
      }
    } catch (_) {
      toast.error("Network error");
    } finally {
      setCreatingAssoc(false);
    }
  };

  // ── CSV File Selection & Preview ──────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a valid .csv file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("CSV file size exceeds 5MB limit.");
      return;
    }

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setCsvFileContent(text);
        await generateCsvPreview(text);
      }
    };
    reader.readAsText(file);
  };

  const downloadCsvTemplate = () => {
    const csvContent =
      "Name,Phone,Role,City\n" +
      "Suresh Kumar,9847123456,Sound Engineer,Kochi\n" +
      "Rahul Menon,9846234567,Lighting Technician,Thiruvananthapuram\n" +
      "Anjali Nair,9895345678,Camera Operator,Kozhikode\n" +
      "Fahad Basheer,9744456789,LED Wall Tech,Thrissur\n" +
      "Nikhil George,9447567890,Stage Manager,Kollam\n" +
      "Deepak Raj,9526678901,Rigging Tech,Kannur\n" +
      "Vineeth Pillai,9633789012,Video Switching,Palakkad\n" +
      "Midhun Das,9895890123,Drone Pilot,Alappuzha\n" +
      "Sanju Varghese,9400901234,Backline Tech,Kottayam\n" +
      "Arun Chandran,9745012345,Production Assistant,Malappuram\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "crewhive_member_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV template downloaded with required fields: Name, Phone, Role, City");
  };

  const generateCsvPreview = async (csvText) => {
    try {
      let assocId = selectedAssocForImport;
      if (!assocId && associations.length > 0) {
        assocId = associations[0].id;
        setSelectedAssocForImport(assocId);
      }
      if (!assocId) {
        toast.error("Please create or select an association first before importing CSV.");
        return;
      }
      const token = await auth.currentUser?.getIdToken();
      const res = await apiFetch("/api/admin/associations/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          associationId: assocId,
          csvText,
          action: "preview",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCsvPreview(json);
        toast.success(`CSV parsed: ${json.summary.validRows} valid rows found.`);
      } else {
        toast.error(json.error || "CSV validation failed.");
      }
    } catch (_) {
      toast.error("Failed to generate preview");
    }
  };

  const handleExecuteCsvImport = async (sendInvites = false) => {
    if (!csvPreview || !selectedAssocForImport) return;
    setImporting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await apiFetch("/api/admin/associations/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          associationId: selectedAssocForImport,
          rows: csvPreview.rows,
          action: "execute",
          sendInvites,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          `Import complete! ${json.importedCount} members recorded.${
            sendInvites ? ` (${json.invitesSentCount} WhatsApp invites queued)` : ""
          }`
        );
        setCsvPreview(null);
        setCsvFileContent("");
        setCsvFileName("");
        loadAssociations();
      } else {
        toast.error(json.error || "Import failed.");
      }
    } catch (_) {
      toast.error("Network error during import");
    } finally {
      setImporting(false);
    }
  };

  return (
    <AuthGuard requiredRole={USER_ROLES.ADMIN}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />

        {/* Admin Navigation Strip */}
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                  CrewHive Administration & Moderation
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
                  Admin Control Center
                </h1>
              </div>

              {/* Navigation Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted rounded-xl border border-border">
                {[
                  { id: "metrics", label: "Metrics", icon: <BarChart3 className="w-3.5 h-3.5" /> },
                  { id: "profiles", label: "Profiles & Approvals", icon: <Users className="w-3.5 h-3.5" /> },
                  { id: "reports", label: "Report Moderation", icon: <Flag className="w-3.5 h-3.5" /> },
                  { id: "roles", label: "Roles", icon: <Sliders className="w-3.5 h-3.5" /> },
                  { id: "cities", label: "Cities", icon: <MapPin className="w-3.5 h-3.5" /> },
                  { id: "associations", label: "Associations & CSV", icon: <Building className="w-3.5 h-3.5" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: GENUINE METRICS DASHBOARD (SECTION 15E)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "metrics" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Platform Activity & Telemetry</h2>
                  <p className="text-xs text-muted-foreground">
                    Derived from genuine database records. No mock or placeholder numbers.
                  </p>
                </div>
              </div>

              {metricsLoading || !metrics ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-28 bg-card border border-border rounded-2xl" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-card border border-border rounded-2xl p-4">
                      <span className="text-[11px] text-muted-foreground block">Total Crew</span>
                      <span className="text-2xl font-bold text-foreground">
                        {metrics.summary.totalCrew}
                      </span>
                      <span className="text-[10px] text-emerald-400 block mt-1">
                        {metrics.summary.approvedCrew} approved
                      </span>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4">
                      <span className="text-[11px] text-muted-foreground block">Active Availability</span>
                      <span className="text-2xl font-bold text-emerald-400">
                        {metrics.summary.activeAvailability}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-1">
                        Ready for work now
                      </span>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4">
                      <span className="text-[11px] text-muted-foreground block">Organizers</span>
                      <span className="text-2xl font-bold text-primary">
                        {metrics.summary.totalOrganizers}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-1">
                        Registered recruiters
                      </span>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4">
                      <span className="text-[11px] text-muted-foreground block">Requests Sent</span>
                      <span className="text-2xl font-bold text-foreground">
                        {metrics.summary.totalRequestsSent}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-1">
                        Availability pings
                      </span>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4">
                      <span className="text-[11px] text-muted-foreground block">Accepted Replies</span>
                      <span className="text-2xl font-bold text-emerald-400">
                        {metrics.summary.acceptedReplies}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-1">
                        Crew confirmed available
                      </span>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4">
                      <span className="text-[11px] text-muted-foreground block">Declined Replies</span>
                      <span className="text-2xl font-bold text-rose-400">
                        {metrics.summary.declinedReplies}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-1">
                        Crew busy on date
                      </span>
                    </div>
                  </div>

                  {/* Distributions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Signups by City */}
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Signups by City / District
                      </h3>
                      <div className="divide-y divide-border/60">
                        {metrics.signupsByCity.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No city records</p>
                        ) : (
                          metrics.signupsByCity.map((c, i) => (
                            <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground">{c.city}</span>
                              <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                                {c.count} users
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Signups by Role */}
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-primary" />
                        Signups by Professional Role
                      </h3>
                      <div className="divide-y divide-border/60">
                        {metrics.signupsByRole.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2">No role records</p>
                        ) : (
                          metrics.signupsByRole.map((r, i) => (
                            <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground">{r.role}</span>
                              <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                                {r.count} crew
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: PROFILES & APPROVALS (SECTION 15A)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "profiles" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">Crew Profile Moderation & Approvals</h2>
                  <p className="text-xs text-muted-foreground">
                    Review crew applications, hide inappropriate profiles, and edit classifications.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {["all", "pending", "approved", "hidden"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setProfileFilter(f)}
                      className={`text-xs px-3 py-1.5 rounded-lg capitalize font-semibold transition-all ${
                        profileFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {profileLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading profiles...</div>
              ) : profiles.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-8 text-center text-xs text-muted-foreground">
                  No profiles found in &ldquo;{profileFilter}&rdquo; status.
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/60">
                  {profiles.map((p) => {
                    const isPending = p.status === "pending";
                    const isApproved = p.status === "approved";
                    const isHidden = Boolean(p.hidden);

                    return (
                      <div
                        key={p.id}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{p.name || "Technician"}</span>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                              {p.role || "Role unassigned"}
                            </span>
                            <StatusBadge status={p.status} type="crew" />
                            {isHidden && (
                              <span className="text-[10px] bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                                <EyeOff className="w-3 h-3" />
                                Hidden from Search
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                            <span>Phone: {p.phone || `+${p.id}`}</span>
                            <span>City: {p.city || "Kerala"}</span>
                            <span>Experience: {p.experience || "Not specified"}</span>
                            <span>Registered: {formatDate(p.createdAt)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {/* Approve / Reject buttons */}
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleProfileApproval(p.id, "approve")}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleProfileApproval(p.id, "reject")}
                                className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs h-8"
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}

                          {/* Toggle Hide */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleHide(p.id)}
                            className="text-xs h-8 gap-1"
                          >
                            {isHidden ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                Unhide
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                                Hide Profile
                              </>
                            )}
                          </Button>

                          {/* Edit Classification */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingProfile(p);
                              setEditRoleVal(p.role || "");
                              setEditCityVal(p.city || "");
                            }}
                            className="text-xs h-8 gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit Role
                          </Button>

                          <Button asChild size="sm" variant="ghost" className="text-xs h-8">
                            <Link href={`/organizer/crew/${p.id}`}>View</Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: REPORT MODERATION QUEUE (SECTION 15B)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Report Moderation Queue</h2>
                  <p className="text-xs text-muted-foreground">
                    Investigate submitted reports against technician or recruiter profiles.
                  </p>
                </div>
              </div>

              {reportsLoading ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading reports...</div>
              ) : reports.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  Report queue is clear. No active flags.
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl divide-y divide-border/60">
                  {reports.map((rep) => (
                    <div key={rep.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            Report against {rep.reportedName || rep.reportedProfileId}
                          </span>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                            {rep.reason}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                              rep.status === "pending"
                                ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                                : "bg-emerald-400/10 text-emerald-400"
                            }`}
                          >
                            {rep.status}
                          </span>
                        </div>
                        {rep.details && (
                          <p className="text-xs text-muted-foreground italic">&ldquo;{rep.details}&rdquo;</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                          <span>Reported by: {rep.reporterPhone || "Anonymous"}</span>
                          <span>Submitted: {formatDate(rep.createdAt)}</span>
                        </div>
                      </div>

                      {rep.status === "pending" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleResolveReport(rep.id, "hide_profile")}
                            className="text-xs h-8"
                          >
                            <EyeOff className="w-3.5 h-3.5 mr-1" />
                            Hide Profile & Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveReport(rep.id, "dismiss")}
                            className="text-xs h-8"
                          >
                            Dismiss
                          </Button>
                          <Button asChild size="sm" variant="ghost" className="text-xs h-8">
                            <Link href={`/organizer/crew/${rep.reportedProfileId}`}>Inspect</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: ROLE TAXONOMY (SECTION 15C)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "roles" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">Role Taxonomy Management</h2>
                  <p className="text-xs text-muted-foreground">
                    10 core parent professional roles with English and Malayalam labels.
                  </p>
                </div>
              </div>

              {/* Add New Role Form */}
              <form
                onSubmit={handleAddRole}
                className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-end gap-3"
              >
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold mb-1">Role Name (English) *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Visual Effects"
                    value={newRoleNameEn}
                    onChange={(e) => setNewRoleNameEn(e.target.value)}
                    className="bg-muted text-xs"
                    required
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold mb-1">Role Name (Malayalam)</label>
                  <Input
                    type="text"
                    placeholder="e.g. വിഷ്വൽ ഇഫക്റ്റ്സ്"
                    value={newRoleNameMl}
                    onChange={(e) => setNewRoleNameMl(e.target.value)}
                    className="bg-muted text-xs"
                  />
                </div>
                <Button type="submit" size="sm" className="bg-primary text-primary-foreground text-xs h-9 gap-1 shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                  Add Parent Role
                </Button>
              </form>

              {/* Roles Table */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/60">
                {rolesList.map((r, i) => (
                  <div key={r.id || i} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{r.nameEn}</span>
                        {r.nameMl && (
                          <span className="text-xs text-primary font-medium">({r.nameMl})</span>
                        )}
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          ID: {r.id}
                        </span>
                      </div>
                      {Array.isArray(r.specialisations) && r.specialisations.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Specialisations: {r.specialisations.map((s) => s.nameEn).join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">Order: {r.sortOrder || i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 5: CITY MANAGEMENT (SECTION 15D)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "cities" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Supported Cities & Districts</h2>
                  <p className="text-xs text-muted-foreground">
                    Manage locations across Kerala for search and onboarding.
                  </p>
                </div>
              </div>

              {/* Add City Form */}
              <form
                onSubmit={handleAddCity}
                className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-end gap-3"
              >
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold mb-1">City / District (English) *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Kozhikode"
                    value={newCityEn}
                    onChange={(e) => setNewCityEn(e.target.value)}
                    className="bg-muted text-xs"
                    required
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold mb-1">City / District (Malayalam)</label>
                  <Input
                    type="text"
                    placeholder="e.g. കോഴിക്കോട്"
                    value={newCityMl}
                    onChange={(e) => setNewCityMl(e.target.value)}
                    className="bg-muted text-xs"
                  />
                </div>
                <Button type="submit" size="sm" className="bg-primary text-primary-foreground text-xs h-9 gap-1 shrink-0">
                  <Plus className="w-3.5 h-3.5" />
                  Add City
                </Button>
              </form>

              {/* Cities Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {citiesList.map((c, i) => (
                  <div key={c.id || i} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-foreground block">{c.nameEn}</span>
                      <span className="text-[11px] text-muted-foreground">{c.nameMl || "—"}</span>
                    </div>
                    {c.isLaunchCity && (
                      <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                        Launch Hub
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 6: ASSOCIATIONS & CSV IMPORT (SECTION 16)
          ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "associations" && (
            <div className="space-y-8">
              {/* Header */}
              <div>
                <h2 className="text-lg font-bold">Association Administration & Bulk CSV Onboarding</h2>
                <p className="text-xs text-muted-foreground">
                  Register industry associations (FEFKA, etc.), generate join codes, and securely import member rosters.
                </p>
              </div>

              {/* Create Association */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-xs">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" />
                  Register Association
                </h3>
                <form onSubmit={handleCreateAssociation} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Association Name *</label>
                    <Input
                      type="text"
                      placeholder="e.g. FEFKA Directors Union"
                      value={newAssocName}
                      onChange={(e) => setNewAssocName(e.target.value)}
                      className="bg-muted text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Unique Join Code *</label>
                    <Input
                      type="text"
                      placeholder="e.g. FEFKA2026"
                      value={newAssocCode}
                      onChange={(e) => setNewAssocCode(e.target.value)}
                      className="bg-muted text-xs uppercase"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={creatingAssoc} className="bg-primary text-primary-foreground text-xs h-9">
                    {creatingAssoc ? "Creating..." : "Create Association"}
                  </Button>
                </form>
              </div>

              {/* Active Associations List */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border/60">
                <div className="p-4 bg-muted/40 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Registered Associations
                </div>
                {associations.length === 0 ? (
                  <p className="p-6 text-xs text-muted-foreground text-center">No associations created yet.</p>
                ) : (
                  associations.map((a) => (
                    <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{a.name}</span>
                          <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                            Code: {a.code}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Join Link: <code className="text-foreground">{a.joinUrl}</code>
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">{a.verifiedMembers || 0}</span> verified members
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ── CSV BULK IMPORT WORKSPACE (SECTION 16) ───────────────────── */}
              <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-primary" />
                      Bulk Member Import (CSV)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload member CSV to validate rows, check duplicates, preview records, and dispatch WhatsApp invites.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all cursor-pointer w-fit shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download CSV Template
                  </button>
                </div>

                {/* Target Association Selector */}
                <div className="max-w-xs">
                  <label className="block text-xs font-semibold mb-1">Target Association *</label>
                  <select
                    value={selectedAssocForImport}
                    onChange={(e) => setSelectedAssocForImport(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl p-2.5 text-xs outline-none"
                  >
                    {associations.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Dropzone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-muted/20"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-xs font-bold text-foreground">
                    {csvFileName ? `Selected: ${csvFileName}` : "Click to select or drop CSV file"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Columns required: Name, Phone/Mobile, Role, City (Max 5MB)
                  </p>
                </div>

                {/* Preview Table & Summary */}
                {csvPreview && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-muted p-3 rounded-xl text-center">
                        <span className="text-[11px] text-muted-foreground block">Total Rows</span>
                        <span className="text-lg font-bold text-foreground">
                          {csvPreview.summary.totalRows}
                        </span>
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-xl text-center">
                        <span className="text-[11px] block">Valid & Ready</span>
                        <span className="text-lg font-bold">{csvPreview.summary.validRows}</span>
                      </div>
                      <div className="bg-amber-500/10 text-amber-400 p-3 rounded-xl text-center">
                        <span className="text-[11px] block">Duplicates</span>
                        <span className="text-lg font-bold">
                          {csvPreview.summary.duplicateDbRows + csvPreview.summary.duplicateCsvRows}
                        </span>
                      </div>
                      <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-center">
                        <span className="text-[11px] block">Invalid Rows</span>
                        <span className="text-lg font-bold">{csvPreview.summary.invalidRows}</span>
                      </div>
                    </div>

                    {/* Rows Preview */}
                    <div className="max-h-60 overflow-y-auto rounded-xl border border-border">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted text-muted-foreground uppercase text-[10px] sticky top-0">
                          <tr>
                            <th className="p-2.5">Row</th>
                            <th className="p-2.5">Name</th>
                            <th className="p-2.5">Phone</th>
                            <th className="p-2.5">Role</th>
                            <th className="p-2.5">City</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {csvPreview.rows.slice(0, 50).map((r, i) => (
                            <tr key={i} className="hover:bg-muted/30">
                              <td className="p-2.5 font-mono">{r.rowNumber}</td>
                              <td className="p-2.5 font-semibold">{r.name}</td>
                              <td className="p-2.5 font-mono">{r.normalizedPhone || r.phone}</td>
                              <td className="p-2.5">{r.role}</td>
                              <td className="p-2.5">{r.city}</td>
                              <td className="p-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    r.status === "valid" || r.status === "existing_user"
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : "bg-destructive/10 text-destructive"
                                  }`}
                                >
                                  {r.status} {r.reason ? `(${r.reason})` : ""}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Import Execution Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCsvPreview(null);
                          setCsvFileContent("");
                          setCsvFileName("");
                        }}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleExecuteCsvImport(false)}
                        disabled={importing || csvPreview.summary.validRows === 0}
                        variant="outline"
                        className="text-xs font-semibold"
                      >
                        {importing ? "Importing..." : "Import Members Only"}
                      </Button>
                      <Button
                        onClick={() => handleExecuteCsvImport(true)}
                        disabled={importing || csvPreview.summary.validRows === 0}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {importing ? "Processing..." : "Import & Dispatch WhatsApp Invites"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* ── MODAL: EDIT CLASSIFICATION ────────────────────────────────────── */}
        {editingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
              <button
                onClick={() => setEditingProfile(null)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold mb-1">Edit Classification</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Update professional role or operating city for {editingProfile.name}.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Professional Role</label>
                  <Input
                    type="text"
                    value={editRoleVal}
                    onChange={(e) => setEditRoleVal(e.target.value)}
                    className="bg-muted text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">City / District</label>
                  <Input
                    type="text"
                    value={editCityVal}
                    onChange={(e) => setEditCityVal(e.target.value)}
                    className="bg-muted text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingProfile(null)}
                    className="flex-1 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveClassification}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
