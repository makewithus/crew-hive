/**
 * apps/mobile/src/screens/recruiter/RecruiterDashboardScreen.js
 * Recruiter home dashboard with real inquiry metrics and quick search dispatch.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, AppState } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import Button from "../../components/common/Button.js";
import { BriefcaseIcon, SearchIcon, ClockIcon, SettingsIcon } from "../../components/common/AvIcons.js";
import { recruiterService } from "../../services/recruiterService.js";
import { authService } from "../../services/authService.js";
import { findRoleOrSpecialisation, LAUNCH_CITIES, KERALA_DISTRICTS } from "@crew-hive/shared";

export function RecruiterDashboardScreen({ navigation, language, onToggleLanguage, t }) {
  const tr = t || ((k, fallback) => fallback || k);
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isPollingRef = useRef(false);

  const isMl = language === "ml";

  const loadData = useCallback(async (isSilent = false) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    try {
      const [profileData, reqs, feat] = await Promise.all([
        recruiterService.getMyProfile().catch(() => null),
        recruiterService.getMySentRequests().catch(() => []),
        recruiterService.getFeatures().catch(() => null),
      ]);
      setProfile(profileData || authService.getCachedUser());
      setRequests(reqs || []);
      if (feat) setFeatures(feat);
    } catch (err) {
      // offline
    } finally {
      if (!isSilent) {
        setLoading(false);
        setRefreshing(false);
      }
      isPollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadData(false);

    let intervalId = null;
    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          loadData(true);
        }, 8000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startPolling();

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        loadData(true);
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      if (appStateSub?.remove) appStateSub.remove();
    };
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  // Real database metrics computed from requests
  const totalSent = requests.length;
  const acceptedCount = requests.reduce(
    (acc, r) => acc + (r.candidates?.filter((c) => c.status === "accepted" || c.response === "YES").length || 0),
    0
  );
  const pendingCount = requests.reduce(
    (acc, r) => acc + (r.candidates?.filter((c) => c.status === "pending" || !c.response).length || 0),
    0
  );
  const declinedCount = requests.reduce(
    (acc, r) => acc + (r.candidates?.filter((c) => c.status === "declined" || c.response === "NO").length || 0),
    0
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title={tr("recruiter.recruiterDesk", "Recruiter Desk")}
        subtitle={tr("recruiter.sourcingSubtitle", "Kerala AV Sourcing")}
        language={language}
        onToggleLanguage={onToggleLanguage}
        rightAction={
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            style={styles.headerSettingsBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Settings"
          >
            <SettingsIcon size={20} color={Colors.text.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent.amber}
          />
        }
      >
        {/* Recruiter Header Card */}
        <Card style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <View style={styles.iconCircle}>
              <BriefcaseIcon size={24} color={Colors.accent.amber} />
            </View>
            <View style={styles.welcomeText}>
              <Text style={styles.companyName}>
                {profile?.companyName || profile?.name || (isMl ? "പ്രൊഡക്ഷൻ ഡെസ്ക്" : "Production Desk")}
              </Text>
              <Text style={styles.companyCity}>
                {(() => {
                  const rawC = typeof profile?.city === "object" ? (profile.city.nameEn || profile.city.name || "Kochi") : (profile?.city || "Kochi");
                  const match = LAUNCH_CITIES.find((c) => (c.nameEn || c.name || "").toLowerCase() === String(rawC).toLowerCase());
                  const cName = isMl ? (match?.nameMl || rawC) : (match?.nameEn || rawC);
                  return `${cName}, ${isMl ? "കേരളം" : "Kerala"}`;
                })()} • {tr("recruiter.verifiedOrganizer", "Verified Organizer")}
              </Text>
            </View>
            <Badge label={tr("crew.verified", "VERIFIED")} variant="green" size="sm" />
          </View>
        </Card>

        {/* Recruiter Trial Days Remaining Banner (F2) */}
        {features?.activeTier === "trial" && (
          <Card style={styles.trialCard}>
            <View style={styles.trialRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.trialTitle}>
                  {isMl ? "സൗജന്യ ട്രയൽ സജീവം" : "Recruiter Trial Active"}
                </Text>
                <Text style={styles.trialDesc}>
                  {isMl
                    ? `നിങ്ങളുടെ സൗജന്യ ട്രയലിൽ ${features.trialDaysRemaining ?? 7} ദിവസങ്ങൾ ബാക്കിയുണ്ട്. നേരിട്ടുള്ള ബുക്കിംഗ്, 0% കമ്മീഷൻ.`
                    : `${features.trialDaysRemaining ?? 7} days remaining in your free trial. Direct crew pings with 0% platform commissions.`}
                </Text>
              </View>
              <Badge
                label={`${features.trialDaysRemaining ?? 7}D LEFT`}
                variant="amber"
                size="sm"
              />
            </View>
          </Card>
        )}

        {/* Primary Sourcing CTA */}
        <Card style={styles.actionHeroCard}>
          <Text style={styles.actionHeroTitle}>{tr("recruiter.urgentCrewNeeded", "Urgent Crew Needed?")}</Text>
          <Text style={styles.actionHeroDesc}>
            {tr("recruiter.urgentCrewDesc", "Search technicians with 18-hour active availability or dispatch multi-candidate inquiries directly.")}
          </Text>
          <View style={styles.ctaRow}>
            <View style={{ flex: 1 }}>
              <Button
                title={tr("recruiter.searchCrewCta", "Search Crew")}
                variant="primary"
                size="md"
                icon={<SearchIcon size={16} color="#000000" />}
                onPress={() => navigation.navigate("CrewSearch")}
                style={styles.heroBtn}
                textStyle={styles.heroBtnText}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={tr("recruiter.newInquiryBtn", "New Inquiry")}
                variant="outline"
                size="md"
                onPress={() => navigation.navigate("CreateRequest")}
                style={styles.heroBtn}
                textStyle={styles.heroBtnText}
              />
            </View>
          </View>
        </Card>

        {/* Real Sourcing Metrics */}
        <Text style={styles.sectionHeading}>{tr("recruiter.dispatchMetrics", "DISPATCH & RESPONSE METRICS")}</Text>
        <View style={styles.metricsGrid}>
          <Card style={styles.metricCard}>
            <Text style={styles.metricNumber}>{totalSent}</Text>
            <Text style={styles.metricLabel}>{tr("recruiter.statsSent", "Inquiries Sent")}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: Colors.semantic.success }]}>
              {acceptedCount}
            </Text>
            <Text style={styles.metricLabel}>{tr("recruiter.confirmedYes", "Confirmed (YES)")}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: Colors.accent.amber }]}>
              {pendingCount}
            </Text>
            <Text style={styles.metricLabel}>{tr("recruiter.awaitingPings", "Awaiting Pings")}</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: Colors.text.muted }]}>
              {declinedCount}
            </Text>
            <Text style={styles.metricLabel}>{tr("recruiter.declinedNo", "Declined (NO)")}</Text>
          </Card>
        </View>

        {/* Recent Inquiries List */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionHeading}>{tr("recruiter.recentInquiries", "RECENT INQUIRIES")}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("RequestsSent")}>
            <Text style={styles.viewAllText}>{tr("recruiter.viewAll", "View All")} ({totalSent}) ›</Text>
          </TouchableOpacity>
        </View>

        {requests.slice(0, 3).map((req, idx) => (
          <TouchableOpacity
            key={req.id || `rec_inq_${idx}`}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("RequestsSent", { selectedRequestId: req.id })}
          >
            <Card style={styles.reqItemCard}>
              <View style={styles.reqHeaderRow}>
                <Text style={styles.reqTitle}>{req.projectTitle || (isMl ? "ഓഡിയോ-വിഷ്വൽ വർക്ക്" : "Audio-Visual Call")}</Text>
                <Badge
                  label={`${req.candidates?.length || 0} ${isMl ? "അന്വേഷണങ്ങൾ" : "PINGS"}`}
                  variant="amber"
                  size="sm"
                />
              </View>
              <Text style={styles.reqSub}>
                {isMl ? "വിഭാഗം: " : "Role: "}
                {(() => {
                  const f = findRoleOrSpecialisation(req.role, language);
                  return (f?.label || (req.role || "Technician")).replace(/_/g, " ").toUpperCase();
                })()} • {typeof req.location === "object" ? (isMl ? (req.location.nameMl || req.location.nameEn) : req.location.nameEn) : (req.location || (isMl ? "കേരളം" : "Kerala"))}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}

        {requests.length === 0 && !loading && (
          <Card style={styles.emptyCard}>
            <ClockIcon size={32} color={Colors.text.muted} />
            <Text style={styles.emptyTitle}>{tr("recruiter.noInquiriesTitle", "No Inquiries Dispatched Yet")}</Text>
            <Text style={styles.emptySub}>
              {tr("recruiter.noInquiriesDesc", "Send your first call to search and match Kerala technicians.")}
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg.base,
  },
  content: {
    padding: Dimensions.screenPadding,
    paddingBottom: 24,
  },
  welcomeCard: {
    padding: 16,
    marginBottom: 16,
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.raised,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  welcomeText: {
    flex: 1,
  },
  companyName: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  companyCity: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  actionHeroCard: {
    padding: 18,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.accent.amber,
    backgroundColor: "rgba(245, 166, 35, 0.08)",
  },
  trialCard: {
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.4)",
    backgroundColor: "rgba(245, 166, 35, 0.07)",
    borderRadius: Radius.lg,
  },
  trialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  trialTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.amber,
    marginBottom: 2,
  },
  trialDesc: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  actionHeroTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  actionHeroDesc: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  heroBtn: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 46,
  },
  heroBtnText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
  },
  sectionHeading: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.amber,
    letterSpacing: 1,
    marginBottom: 10,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    width: "48%",
    padding: 14,
    alignItems: "center",
  },
  metricNumber: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  viewAllText: {
    fontSize: Typography.size.xs,
    color: Colors.accent.amber,
    fontWeight: Typography.weight.semiBold,
  },
  reqItemCard: {
    padding: 14,
    marginBottom: 10,
  },
  reqHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reqTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  reqSub: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  emptySub: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  headerSettingsBtn: {
    padding: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.raised,
    marginLeft: 8,
  },
});

export default RecruiterDashboardScreen;

