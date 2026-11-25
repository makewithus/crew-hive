/**
 * apps/mobile/src/screens/crew/CrewDashboardScreen.js
 * Master dashboard for Kerala AV technicians: 18h availability, inquiries, profile completeness.
 */

import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import Button from "../../components/common/Button.js";
import { ConsoleFaderIcon, ClockIcon, MapPinIcon, ShieldCheckIcon, SettingsIcon } from "../../components/common/AvIcons.js";
import { crewService } from "../../services/crewService.js";
import { computeProfileCompleteness, findRoleOrSpecialisation, LAUNCH_CITIES, KERALA_DISTRICTS } from "@crew-hive/shared";

export function CrewDashboardScreen({ navigation, language, onToggleLanguage, t }) {
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [profileData, reqData] = await Promise.all([
        crewService.getMyProfile().catch(() => null),
        crewService.getIncomingRequests().catch(() => []),
      ]);
      setProfile(profileData);
      setRequests(reqData || []);
    } catch (err) {
      // offline fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const completeness = profile ? computeProfileCompleteness(profile) : 60;
  const isAvailable = Boolean(profile?.availableNow);
  const pendingRequestsCount = requests.filter((r) => r.status === "pending").length;

  const isMl = language === "ml";
  const craftLookup = profile?.primaryRole ? findRoleOrSpecialisation(profile.primaryRole, language) : null;
  const craftDisplay = (craftLookup?.label || (profile?.primaryRole || "Sound Engineer")).replace(/_/g, " ").toUpperCase();

  const rawCity = typeof profile?.city === "object" ? (profile.city.nameEn || profile.city.name || "Kochi") : (profile?.city || "Kochi");
  const cityMatch =
    LAUNCH_CITIES.find((c) => (c.nameEn || c.name || "").toLowerCase() === String(rawCity).toLowerCase()) ||
    KERALA_DISTRICTS.find((d) => (d.nameEn || d.name || "").toLowerCase() === String(rawCity).toLowerCase());
  const cityDisplay = isMl ? (cityMatch?.nameMl || rawCity) : (cityMatch?.nameEn || rawCity);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title={t("crew.workspaceTitle", "Crew Workspace")}
        subtitle={t("crew.networkSubtitle", "Kerala AV Network")}
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
        {/* Welcome Card */}
        <Card style={styles.profileSummaryCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <ConsoleFaderIcon size={24} color={Colors.accent.amber} />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.crewName}>
                {profile?.name || (t ? t("crew.avTechnician", "AV Technician") : "AV Technician")}
              </Text>
              <Text style={styles.crewCraft} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.85}>
                {craftDisplay} • {cityDisplay}
              </Text>
            </View>
            <Badge
              label={profile?.approved ? t("crew.verified", "VERIFIED") : t("crew.underReview", "UNDER REVIEW")}
              variant={profile?.approved ? "green" : "amber"}
              size="sm"
            />
          </View>
        </Card>

        {/* 18h Availability Toggle Hero Card */}
        <Card
          style={[
            styles.availabilityCard,
            isAvailable && styles.availabilityActiveCard,
          ]}
        >
          <View style={styles.availHeader}>
            <View style={styles.availStatusRow}>
              <View
                style={[
                  styles.statusPulse,
                  isAvailable ? styles.pulseActive : styles.pulseInactive,
                ]}
              />
              <Text style={styles.availStatusText}>
                {isAvailable ? t("crew.activeGigs", "ACTIVE: AVAILABLE FOR GIGS") : t("crew.currentlyOffline", "CURRENTLY OFFLINE")}
              </Text>
            </View>
            {isAvailable && (
              <Badge label={t("crew.eighteenHourWindow", "18-HR WINDOW")} variant="amber" size="sm" />
            )}
          </View>

          <Text style={styles.availDesc}>
            {isAvailable
              ? t("crew.visibleDesc", "You are visible to verified recruiters near {{city}}. Your broadcast expires automatically.").replace("{{city}}", profile?.coarseCity || profile?.city || "your base")
              : t("crew.offlineDesc", "Toggle your 18-hour availability window to appear in urgent crew searches across Kerala.")}
          </Text>

          <Button
            title={isAvailable ? t("crew.manageAvailability", "Manage / Turn Off Availability") : t("crew.activateAvailability", "Activate 18h Availability")}
            variant={isAvailable ? "ghost" : "primary"}
            size="md"
            onPress={() => navigation.navigate("AvailabilityModal")}
            style={styles.availBtn}
          />
        </Card>

        {/* Incoming Inquiries Banner */}
        {pendingRequestsCount > 0 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate("IncomingRequests")}
          >
            <Card style={styles.inquiriesBanner}>
              <View style={styles.inquiryAlertRow}>
                <View style={styles.inquiryBadge}>
                  <Text style={styles.inquiryBadgeText}>{pendingRequestsCount}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inquiryTitle}>{t("crew.newInquiriesTitle", "New Availability Inquiries!")}</Text>
                  <Text style={styles.inquirySub}>{t("crew.newInquiriesSub", "Recruiters are checking your schedule for upcoming calls")}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Profile Completeness Gauge */}
        <Card style={styles.card}>
          <View style={styles.completenessHeader}>
            <Text style={styles.cardTitle}>{t("crew.completenessTitle", "Profile Completeness")}</Text>
            <Text style={styles.percentageText}>{completeness}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${completeness}%` }]} />
          </View>
          <Text style={styles.completenessTip}>
            {completeness < 100
              ? t("crew.completenessTip", "Add day rates, portfolio credits, and association guild numbers to rank higher in recruiter searches.")
              : t("crew.completenessOptimized", "Your profile is fully optimized for top recruiter discovery!")}
          </Text>
          {completeness < 100 && (
            <Button
              title={t("crew.enhanceProfile", "Enhance Profile")}
              variant="outline"
              size="sm"
              onPress={() => navigation.navigate("EditProfile")}
              style={{ marginTop: 10 }}
            />
          )}
        </Card>

        {/* Action Grid */}
        <Text style={styles.sectionHeading}>{t("crew.quickActions", "QUICK ACTIONS")}</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("CrewProfile")}
          >
            <Card style={styles.actionCard}>
              <ConsoleFaderIcon size={24} color={Colors.accent.amber} />
              <Text style={styles.actionTitle}>{t("crew.publicProfile", "Public Profile")}</Text>
              <Text style={styles.actionSub} numberOfLines={2}>{t("crew.publicProfileDesc", "Preview what recruiters see")}</Text>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("IncomingRequests")}
          >
            <Card style={styles.actionCard}>
              <ClockIcon size={24} color={Colors.accent.amber} />
              <Text style={styles.actionTitle}>{t("crew.inquiryHistory", "Inquiry History")}</Text>
              <Text style={styles.actionSub} numberOfLines={2}>{requests.length} {t("crew.totalLogged", "total logged")}</Text>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Direct Booking Guarantee Card */}
        <Card style={styles.trustCard}>
          <View style={styles.trustRow}>
            <View style={styles.trustIconWrap}>
              <ShieldCheckIcon size={20} color={Colors.accent.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.trustTitle}>{t("crew.directBookingTitle", "Direct Booking Guarantee")}</Text>
              <Text style={styles.trustSub}>{t("crew.directBookingDesc", "Zero commission deducted. Verified Kerala recruiters contact you directly.")}</Text>
            </View>
          </View>
        </Card>
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
  profileSummaryCard: {
    padding: 16,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.raised,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  profileText: {
    flex: 1,
  },
  crewName: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  crewCraft: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  availabilityCard: {
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.border.subtle,
  },
  availabilityActiveCard: {
    borderColor: Colors.accent.amber,
    backgroundColor: "rgba(245, 166, 35, 0.06)",
  },
  availHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  availStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusPulse: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
  pulseActive: {
    backgroundColor: Colors.semantic.success,
  },
  pulseInactive: {
    backgroundColor: Colors.text.muted,
  },
  availStatusText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  availDesc: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  availBtn: {
    width: "100%",
  },
  inquiriesBanner: {
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: Colors.accent.amber,
    backgroundColor: "rgba(245, 166, 35, 0.12)",
  },
  inquiryAlertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inquiryBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  inquiryBadgeText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.bg.base,
  },
  inquiryTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  inquirySub: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: Typography.size.xl,
    color: Colors.accent.amber,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  completenessHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  percentageText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.amber,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.raised,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.accent.amber,
    borderRadius: Radius.full,
  },
  completenessTip: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.amber,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
    marginBottom: 16,
  },
  actionItem: {
    flex: 1,
  },
  actionCard: {
    flex: 1,
    height: 124,
    padding: 14,
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  actionTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
  },
  actionSub: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
  },
  trustCard: {
    padding: 14,
    backgroundColor: "rgba(245, 166, 35, 0.06)",
    borderColor: "rgba(245, 166, 35, 0.20)",
    marginBottom: 16,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trustIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  trustTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.amber,
    marginBottom: 2,
  },
  trustSub: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  headerSettingsBtn: {
    padding: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.raised,
    marginLeft: 8,
  },
});

export default CrewDashboardScreen;

