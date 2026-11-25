/**
 * apps/mobile/src/screens/crew/CrewProfileScreen.js
 * Public profile view showing verified trade credentials and rate settings.
 */

import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Share, Image } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import Button from "../../components/common/Button.js";
import { confirmModal } from "../../components/common/ThemedModal.js";
import { toast } from "../../components/common/Toast.js";
import { ConsoleFaderIcon, MapPinIcon, ShieldCheckIcon, SettingsIcon, LogOutIcon } from "../../components/common/AvIcons.js";
import { crewService } from "../../services/crewService.js";
import { authService } from "../../services/authService.js";
import { findRoleOrSpecialisation, LAUNCH_CITIES, KERALA_DISTRICTS } from "@crew-hive/shared";

export function CrewProfileScreen({ navigation, route, language, onToggleLanguage, onLogout, t }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    try {
      const data = await crewService.getMyProfile();
      setProfile(data);
    } catch (err) {
      // offline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const isMl = language === "ml";

  // Localize craft / role
  const craftLookup = profile?.primaryRole ? findRoleOrSpecialisation(profile.primaryRole, language) : null;
  const craftDisplay = (craftLookup?.label || (profile?.primaryRole || "Sound Engineer")).replace(/_/g, " ").toUpperCase();

  // Localize city and state
  const rawCity = typeof profile?.city === "object" ? (profile.city.nameEn || profile.city.name || "Kochi") : (profile?.city || "Kochi");
  const cityMatch =
    LAUNCH_CITIES.find((c) => (c.nameEn || c.name || "").toLowerCase() === String(rawCity).toLowerCase()) ||
    KERALA_DISTRICTS.find((d) => (d.nameEn || d.name || "").toLowerCase() === String(rawCity).toLowerCase());
  const cityDisplay = isMl ? (cityMatch?.nameMl || rawCity) : (cityMatch?.nameEn || rawCity);
  const stateDisplay = isMl ? "കേരളം" : "Kerala";

  // Localize day rate
  const dayRateDisplay =
    profile?.showDayRate && profile?.dayRate
      ? `₹${Number(profile.dayRate).toLocaleString("en-IN")} ${t ? t("common.day", "/ day") : "/ day"}`
      : (t ? t("common.rateOnRequest", "Rate on request") : "Rate on request");

  // Localize experience string
  const rawExp = profile?.experience || "Experienced";
  const experienceDisplay =
    isMl && (rawExp === "Experienced" || rawExp === "experienced")
      ? (t ? t("crew.experienced", "Experienced") : "Experienced")
      : rawExp;

  // Localize travel willingness
  const rawTravel = profile?.travelRadius || "All Kerala Districts";
  const travelDisplay =
    isMl && (rawTravel === "All Kerala" || rawTravel === "All Kerala Districts")
      ? (t ? t("crew.allKeralaDistricts", "All Kerala Districts") : "All Kerala Districts")
      : rawTravel;

  const handleShareProfile = async () => {
    try {
      const profileId = profile?.id || authService.getCachedUser()?.id;
      const profileUrl = `${process.env.EXPO_PUBLIC_WEB_URL || "https://crewhive.in"}/crew/${profileId}`;
      const message = isMl
        ? `ക്രൂഹൈവിൽ എന്റെ പ്രൊഫൈൽ കാണുക (${craftDisplay}): ${profileUrl}`
        : `Check out my technician profile on CrewHive (${craftDisplay}): ${profileUrl}`;
      await Share.share({
        message,
        url: profileUrl,
        title: "My CrewHive Profile",
      });
    } catch (_) {}
  };

  const handleSignOut = () => {
    confirmModal({
      title: isMl ? "ലോഗ് ഔട്ട്" : "Sign Out",
      message: isMl
        ? "ക്ര്യൂഹൈവ് അക്കൗണ്ടിൽ നിന്ന് ലോഗ് ഔട്ട് ചെയ്യണമെന്ന് ഉറപ്പാണോ?"
        : "Are you sure you want to sign out of your CrewHive account?",
      confirmText: isMl ? "ലോഗ് ഔട്ട്" : "Sign Out",
      cancelText: t ? t("common.cancel", "Cancel") : "Cancel",
      variant: "destructive",
      onConfirm: async () => {
        await authService.logout();
        if (onLogout) {
          onLogout();
        } else {
          navigation.reset({
            routes: [{ name: "Welcome" }],
          });
        }
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title={t ? t("crew.publicProfile", "Public Profile") : "Public Profile"}
        subtitle={t ? t("crew.publicDirectoryListing", "Public Directory Listing") : "Public Directory Listing"}
        showBack={true}
        onBack={() => navigation.goBack()}
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
        <Card style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            {profile?.profileImage ? (
              <Image source={{ uri: profile.profileImage }} style={styles.avatarImg} />
            ) : (
              <ConsoleFaderIcon size={36} color={Colors.accent.amber} />
            )}
          </View>
          <Text style={styles.name}>{profile?.name || (t ? t("crew.professionalCrew", "Professional Crew") : "Professional Crew")}</Text>
          <Text style={styles.primaryCraft} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.85}>
            {craftDisplay}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MapPinIcon size={14} color={Colors.text.muted} />
              <Text style={styles.metaText}>
                {cityDisplay}, {stateDisplay}
              </Text>
            </View>
            <Badge
              label={profile?.approved ? (t ? t("crew.verifiedCrew", "VERIFIED CREW") : "VERIFIED CREW") : (t ? t("crew.pendingAudit", "PENDING AUDIT") : "PENDING AUDIT")}
              variant={profile?.approved ? "green" : "amber"}
              size="sm"
            />
          </View>

          {profile?.associationCode && (
            <View style={styles.assocBadge}>
              <ShieldCheckIcon size={14} color={Colors.roles.association} />
              <Text style={styles.assocText}>
                {t ? t("crew.verifiedMember", "Verified Member: ") : "Verified Member: "}
                {profile.associationCode}
              </Text>
            </View>
          )}
        </Card>

        {/* Rate & Availability Overview */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>
            {t ? t("crew.commercialsMobility", "Commercials & Mobility") : "Commercials & Mobility"}
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              {t ? t("crew.standardDayRate", "Standard Day Rate") : "Standard Day Rate"}
            </Text>
            <Text style={styles.infoValue}>{dayRateDisplay}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              {t ? t("crew.travelWillingness", "Travel Willingness") : "Travel Willingness"}
            </Text>
            <Text style={styles.infoValue}>{travelDisplay}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              {t ? t("crew.experienceLevel", "Experience Level") : "Experience Level"}
            </Text>
            <Text style={styles.infoValue}>{experienceDisplay}</Text>
          </View>
        </Card>

        {/* Bio & Background */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>
            {t ? t("crew.aboutSpecializations", "About & Specializations") : "About & Specializations"}
          </Text>
          <Text style={styles.bioText}>
            {profile?.bio ||
              (t ? t("crew.defaultBio", "Experienced Kerala audio-visual technician specializing in concert sound, live event mixing, multi-track audio recording, and production stage management.") : "Experienced Kerala audio-visual technician specializing in concert sound, live event mixing, multi-track audio recording, and production stage management.")}
          </Text>

          <View style={styles.tagsContainer}>
            {(profile?.roles || [profile?.primaryRole || "sound_engineer"]).map((r, idx) => {
              const roleId = typeof r === "object" ? (r.id || r.nameEn || `role_${idx}`) : String(r);
              const foundSpec = findRoleOrSpecialisation(roleId, language);
              const roleLabel = (foundSpec?.label || (typeof r === "object" ? (r.nameEn || r.name || roleId) : String(r))).replace(/_/g, " ").toUpperCase();
              return (
                <Badge
                  key={roleId}
                  label={roleLabel}
                  variant="neutral"
                  size="sm"
                />
              );
            })}
          </View>
        </Card>

        {/* Languages Known (B3) */}
        {Array.isArray(profile?.languages) && profile.languages.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>
              {isMl ? "സംസാരിക്കുന്ന ഭാഷകൾ" : "Languages Known"}
            </Text>
            <View style={styles.tagsContainer}>
              {profile.languages.map((lang, idx) => (
                <Badge
                  key={idx}
                  label={lang}
                  variant="amber"
                  size="sm"
                />
              ))}
            </View>
          </Card>
        )}

        {/* Past Credits & Productions (B6) */}
        {Array.isArray(profile?.pastCredits) && profile.pastCredits.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>
              {isMl ? "കഴിഞ്ഞ വർക്കുകൾ & പ്രൊഡക്ഷനുകൾ" : "Past Credits & Productions"}
            </Text>
            {profile.pastCredits.map((c, idx) => (
              <View key={idx} style={styles.creditRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creditName}>{c.eventName}</Text>
                  <Text style={styles.creditSub}>{c.role || "Crew"} • {c.year || ""}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Equipment Owned (B7) */}
        {Array.isArray(profile?.equipmentOwned) && profile.equipmentOwned.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>
              {isMl ? "സ്വന്തം ഉപകരണങ്ങൾ (Gear)" : "Equipment Owned"}
            </Text>
            {profile.equipmentOwned.map((eq, idx) => (
              <View key={idx} style={styles.creditRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creditName}>{eq.name}</Text>
                  <Text style={styles.creditSub}>{eq.category || "Gear"}{eq.model ? ` • ${eq.model}` : ""}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Action Area */}
        <View style={styles.actionSection}>
          <Button
            title={t ? t("crew.editProfileAndRates", "Edit Profile & Rates") : "Edit Profile & Rates"}
            variant="primary"
            size="lg"
            onPress={() => navigation.navigate("EditProfile", { profile })}
            style={styles.editBtn}
          />

          <Button
            title={isMl ? "പ്രൊഫൈൽ ഷെയർ ചെയ്യുക (Share)" : "Share My Profile"}
            variant="outline"
            size="md"
            onPress={handleShareProfile}
            style={{ marginBottom: 12 }}
          />

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.navigate("Settings")}
              style={styles.settingsRowBtn}
            >
              <SettingsIcon size={18} color={Colors.accent.amber} />
              <Text style={styles.settingsBtnText}>
                {isMl ? "സെറ്റിംഗ്സ് & സ്വകാര്യതാ നയം" : "Settings & Privacy Preferences"}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleSignOut}
              style={styles.logoutRowBtn}
            >
              <LogOutIcon size={18} color={Colors.semantic.error} />
              <Text style={styles.logoutBtnText}>
                {isMl ? "ലോഗ് ഔട്ട് ചെയ്യുക" : "Sign Out of Account"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    paddingBottom: 80,
  },
  headerSettingsBtn: {
    padding: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.raised,
    marginLeft: 8,
  },
  actionSection: {
    marginTop: 8,
    marginBottom: 24,
    gap: 14,
  },
  editBtn: {
    width: "100%",
  },
  secondaryActions: {
    gap: 10,
    marginTop: 4,
  },
  settingsRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface.raised,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    gap: 10,
  },
  settingsBtnText: {
    flex: 1,
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  chevron: {
    fontSize: Typography.size.lg,
    color: Colors.text.muted,
  },
  logoutRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(239, 68, 68, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.30)",
    gap: 8,
  },
  logoutBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.semantic.error,
  },
  heroCard: {
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.raised,
    borderWidth: 2,
    borderColor: Colors.accent.amber,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  creditRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  creditName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  creditSub: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: 2,
  },
  name: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  primaryCraft: {
    fontSize: Typography.size.sm,
    color: Colors.accent.amber,
    fontWeight: Typography.weight.semiBold,
    marginTop: 4,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  assocBadge: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.3)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  assocText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semiBold,
    color: Colors.accent.amber,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  infoLabel: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  infoValue: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
  },
  bioText: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  editBtn: {
    marginTop: 8,
  },
});

export default CrewProfileScreen;

