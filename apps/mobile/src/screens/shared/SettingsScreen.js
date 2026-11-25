/**
 * apps/mobile/src/screens/shared/SettingsScreen.js
 * App settings with DPDP privacy controls, structured cards, and sign-out dialog.
 * Note: Language toggle is cleanly hosted in the top Header bar pill [EN | മല].
 */

import React, { useState, useEffect } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Button from "../../components/common/Button.js";
import Badge from "../../components/common/Badge.js";
import { toast } from "../../components/common/Toast.js";
import { confirmModal } from "../../components/common/ThemedModal.js";
import {
  PhoneIcon,
  BriefcaseIcon,
  BellIcon,
  ShieldCheckIcon,
  ZapIcon,
  AlertTriangleIcon,
  LogOutIcon,
  MapPinIcon,
} from "../../components/common/AvIcons.js";
import { authService } from "../../services/authService.js";
import { crewService } from "../../services/crewService.js";
import { locationService } from "../../services/locationService.js";

export function SettingsScreen({
  navigation,
  currentUser,
  language = "en",
  onToggleLanguage,
  onLogout,
  t,
}) {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [locationConsentActive, setLocationConsentActive] = useState(true);
  const insets = useSafeAreaInsets();
  const user = currentUser || authService.getCachedUser();
  const isMl = language === "ml";
  const isRecruiter = user?.role === "recruiter";

  useEffect(() => {
    if (!isRecruiter) {
      crewService.getAvailability().then((status) => {
        if (status?.locationConsent && status.locationConsent.granted === false) {
          setLocationConsentActive(false);
        } else {
          setLocationConsentActive(Boolean(status?.available));
        }
      }).catch(() => {});
    }
  }, [isRecruiter]);

  const handleWithdrawLocationConsent = () => {
    confirmModal({
      title: isMl ? "ലൊക്കേഷൻ അനുമതി പിൻവലിക്കണോ?" : "Withdraw Location Consent?",
      message: isMl
        ? "ഇത് നിങ്ങളുടെ സജീവ ലഭ്യത ഓഫാക്കുകയും സെർവറിൽ നിന്ന് ലൊക്കേഷൻ ഡാറ്റ പൂർണ്ണമായി മായ്ക്കുകയും ചെയ്യും. വീണ്ടും ലഭ്യത ഓണാക്കുമ്പോൾ നിങ്ങൾക്ക് അനുമതി നൽകാം."
        : "This will switch your availability to Offline and permanently clear your coarse coordinates from searches. You can grant consent again whenever you turn availability back on.",
      confirmText: isMl ? "പിൻവലിക്കുക" : "Withdraw Consent",
      cancelText: isMl ? "റദ്ദാക്കുക" : "Cancel",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await crewService.withdrawLocationConsent();
          await locationService.clearCachedLocation();
          setLocationConsentActive(false);
          toast.success(
            isMl
              ? "ലൊക്കേഷൻ വിവരങ്ങൾ നീക്കം ചെയ്തു. നിങ്ങളുടെ ലഭ്യത ഓഫ് ചെയ്തിരിക്കുന്നു."
              : "Location consent has been revoked and coordinates cleared. Your profile is offline.",
            isMl ? "അനുമതി പിൻവലിച്ചു" : "Consent Withdrawn"
          );
        } catch (err) {
          toast.error(err.message || "Failed to withdraw consent", isMl ? "പിശക്" : "Error");
        }
      },
    });
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
            index: 0,
            routes: [{ name: "Welcome" }],
          });
        }
      },
    });
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={isRecruiter ? ["top", "left", "right"] : ["top", "left", "right", "bottom"]}
    >
      <Header
        title={isMl ? "സെറ്റിംഗ്സ്" : "Settings"}
        subtitle={isMl ? "അക്കൗണ്ട് ക്രമീകരണങ്ങൾ" : "Preferences & Account"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: isRecruiter ? 8 : Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Account Info Section */}
        <Text style={styles.sectionHeader}>
          {isMl ? "അക്കൗണ്ട് വിവരങ്ങൾ" : "ACCOUNT"}
        </Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeftGroup}>
              <View style={styles.iconCircle}>
                <PhoneIcon size={16} color={Colors.accent.amber} />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>{isMl ? "ഫോൺ നമ്പർ" : "Phone Number"}</Text>
                <Text style={styles.subtext}>
                  {isMl ? "സ്ഥിരീകരിച്ച മൊബൈൽ" : "Verified mobile number"}
                </Text>
              </View>
            </View>
            <Text style={styles.rowValueMono}>
              {user?.phone || (isMl ? "രജിസ്റ്റർ ചെയ്തത്" : "Registered")}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowLeftGroup}>
              <View style={styles.iconCircle}>
                <BriefcaseIcon size={16} color={Colors.accent.amber} />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>{isMl ? "അക്കൗണ്ട് തരം" : "Account Role"}</Text>
                <Text style={styles.subtext}>
                  {isMl ? "പ്ലാറ്റ്‌ഫോം റോൾ" : "Platform access role"}
                </Text>
              </View>
            </View>
            <Badge
              label={
                user?.role === "recruiter"
                  ? (isMl ? "ഇവന്റ് റിക്രൂട്ടർ" : "EVENT RECRUITER")
                  : (isMl ? "AV ടെക്നീഷ്യൻ" : "AV TECHNICIAN")
              }
              variant="amber"
              size="sm"
            />
          </View>
        </Card>

        {/* 2. Preferences Section (Language is exclusively in Header pill) */}
        <Text style={styles.sectionHeader}>
          {isMl ? "മുൻഗണനകൾ" : "PREFERENCES"}
        </Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeftGroup}>
              <View style={styles.iconCircle}>
                <BellIcon size={16} color={Colors.accent.amber} />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>
                  {isMl ? "പുഷ് നോട്ടിഫിക്കേഷനുകൾ" : "Push Notifications"}
                </Text>
                <Text style={styles.subtext}>
                  {isMl
                    ? "ലഭ്യത അന്വേഷണങ്ങളും പുതിയ അറിയിപ്പുകളും"
                    : "Availability inquiries & broadcast updates"}
                </Text>
              </View>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: Colors.surface.raised, true: Colors.accent.amber }}
              thumbColor={Colors.text.primary}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.clickableRow}
            onPress={() => navigation.navigate("AppTour")}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeftGroup}>
              <View style={styles.iconCircle}>
                <ZapIcon size={16} color={Colors.accent.amber} />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>
                  {isMl ? "ആപ്പ് ടൂർ കാണുക" : "Product Tour"}
                </Text>
                <Text style={styles.subtext}>
                  {isMl ? "പ്ലാറ്റ്‌ഫോം തത്വങ്ങളും ഉപയോഗവും" : "Platform features & 0% commission code"}
                </Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* 3. Legal & DPDP Compliance Section */}
        <Text style={styles.sectionHeader}>
          {isMl ? "സ്വകാര്യതയും നിയമങ്ങളും (DPDP ACT 2023)" : "PRIVACY & COMPLIANCE (DPDP ACT 2023)"}
        </Text>
        <Card style={styles.card}>
          <TouchableOpacity
            style={styles.clickableRow}
            onPress={() => navigation.navigate("TermsPrivacy")}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeftGroup}>
              <View style={styles.iconCircle}>
                <ShieldCheckIcon size={16} color={Colors.roles.association} />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>
                  {isMl ? "സേവന നിബന്ധനകളും സ്വകാര്യതാ നയവും" : "Terms of Service & Privacy Policy"}
                </Text>
                <Text style={styles.subtext}>
                  {isMl ? "ഡാറ്റാ സംരക്ഷണവും നിയമാവലിയും" : "Data protection & terms of use"}
                </Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.clickableRow}
            onPress={() => navigation.navigate("HelpSupport")}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeftGroup}>
              <View style={styles.iconCircle}>
                <ZapIcon size={16} color={Colors.accent.amber} />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowLabel}>
                  {isMl ? "സഹായം, പിന്തുണ & അസോസിയേഷൻ വിവരങ്ങൾ" : "Help, Support & Association Inquiries"}
                </Text>
                <Text style={styles.subtext}>
                  {isMl ? "സഹായ ഡെസ്കും അസോസിയേഷൻ വിവരങ്ങളും" : "Support desk & union guidelines"}
                </Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {!isRecruiter && (
            <>
              <TouchableOpacity
                style={styles.clickableRow}
                onPress={handleWithdrawLocationConsent}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeftGroup}>
                  <View style={styles.iconCircle}>
                    <MapPinIcon size={16} color={Colors.accent.amber} />
                  </View>
                  <View style={styles.rowTextContainer}>
                    <Text style={styles.rowLabel}>
                      {isMl ? "ലൊക്കേഷൻ അനുമതി പിൻവലിക്കുക" : "Withdraw Location Consent"}
                    </Text>
                    <Text style={styles.subtext}>
                      {locationConsentActive
                        ? (isMl ? "സജീവം (ഏകദേശ ജില്ല ~1.1km)" : "Active: Coarse district level (~1.1km)")
                        : (isMl ? "പിൻവലിച്ചു (ലഭ്യത ഓഫാണ്)" : "Withdrawn (Availability Offline)")}
                    </Text>
                  </View>
                </View>
                <Badge
                  label={locationConsentActive ? (isMl ? "സജീവം" : "GRANTED") : (isMl ? "പിൻവലിച്ചു" : "WITHDRAWN")}
                  variant={locationConsentActive ? "green" : "neutral"}
                  size="sm"
                />
              </TouchableOpacity>

              <View style={styles.divider} />
            </>
          )}

          <TouchableOpacity
            style={styles.clickableRow}
            onPress={() => navigation.navigate("AccountDeletion")}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeftGroup}>
              <View style={[styles.iconCircle, styles.dangerIconCircle]}>
                <AlertTriangleIcon size={16} color={Colors.semantic.error} />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={[styles.rowLabel, { color: Colors.semantic.error }]}>
                  {isMl ? "അക്കൗണ്ടും വ്യക്തിഗത ഡാറ്റയും നീക്കം ചെയ്യുക" : "Delete Account & Personal Data"}
                </Text>
                <Text style={styles.subtext}>
                  {isMl ? "DPDP നിയമപ്രകാരമുള്ള സ്ഥിരമായ നീക്കംചെയ്യൽ" : "Permanent erasure under Indian DPDP Act 2023"}
                </Text>
              </View>
            </View>
            <Text style={[styles.chevron, { color: Colors.semantic.error }]}>›</Text>
          </TouchableOpacity>
        </Card>

        {/* 4. Prominent Sign Out Button */}
        <View style={styles.signOutWrapper}>
          <Button
            title={isMl ? "ലോഗ് ഔട്ട് ചെയ്യുക" : "Sign Out of Account"}
            variant="destructive"
            size="default"
            icon={<LogOutIcon size={18} color={Colors.semantic.error} />}
            onPress={handleSignOut}
          />
        </View>

        {/* 5. Safe Area Padded Brand Footer */}
        <View style={styles.footerContainer}>
          <View style={styles.versionPill}>
            <Text style={styles.versionText}>CrewHive Kerala AV Network • v1.0.0</Text>
          </View>
          <Text style={styles.footerTagline}>
            {isMl
              ? "0% കമ്മീഷൻ • കേരളത്തിലെ പ്രൊഫഷണൽ AV ടെക്നീഷ്യൻ നെറ്റ്‌വർക്ക്"
              : "0% Commission Direct Booking • Kerala AV Network"}
          </Text>
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
  },
  sectionHeader: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.amber,
    letterSpacing: 1.1,
    marginTop: 18,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  card: {
    padding: 14,
    marginBottom: 6,
    backgroundColor: Colors.bg.surface,
    borderWidth: 1,
    borderColor: Colors.border.base,
    borderRadius: Radius.xl,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  clickableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  rowLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: "rgba(245, 166, 35, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerIconCircle: {
    backgroundColor: "rgba(239, 68, 68, 0.10)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  rowTextContainer: {
    flex: 1,
  },
  rowLabel: {
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
    fontWeight: Typography.weight.semiBold,
  },
  rowValueMono: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
    fontVariant: ["tabular-nums"],
  },
  subtext: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.subtle,
    marginVertical: 4,
  },
  chevron: {
    fontSize: 20,
    color: Colors.text.muted,
    fontWeight: "300",
  },
  signOutWrapper: {
    marginTop: 16,
    marginBottom: 12,
  },
  footerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
    paddingBottom: 4,
  },
  versionPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.surface,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: 6,
  },
  versionText: {
    fontSize: 11,
    color: Colors.text.muted,
    fontWeight: Typography.weight.medium,
    letterSpacing: 0.3,
  },
  footerTagline: {
    textAlign: "center",
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    lineHeight: 18,
  },
});

export default SettingsScreen;
