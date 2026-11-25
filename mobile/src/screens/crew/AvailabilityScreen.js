/**
 * apps/mobile/src/screens/crew/AvailabilityScreen.js
 * 18-hour ephemeral availability toggle with coarse location and manual city fallback.
 */

import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import Button from "../../components/common/Button.js";
import { toast } from "../../components/common/Toast.js";
import { MapPinIcon, ClockIcon, LockIcon } from "../../components/common/AvIcons.js";
import { crewService } from "../../services/crewService.js";
import { locationService } from "../../services/locationService.js";
import { LAUNCH_CITIES, KERALA_DISTRICTS } from "@crew-hive/shared";

export function AvailabilityScreen({ navigation, language, onToggleLanguage, t }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentCity, setCurrentCity] = useState("Kochi");
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCityOverride, setSelectedCityOverride] = useState("Kochi");

  const isMl = language === "ml";

  // Localize city name
  const rawCity = typeof currentCity === "object" ? (currentCity.nameEn || currentCity.name || "Kochi") : (currentCity || "Kochi");
  const cityMatch =
    LAUNCH_CITIES.find((c) => (c.nameEn || c.name || "").toLowerCase() === String(rawCity).toLowerCase()) ||
    KERALA_DISTRICTS.find((d) => (d.nameEn || d.name || "").toLowerCase() === String(rawCity).toLowerCase());
  const cityDisplay = isMl ? (cityMatch?.nameMl || rawCity) : (cityMatch?.nameEn || rawCity);

  useEffect(() => {
    async function loadStatus() {
      try {
        const status = await crewService.getAvailability();
        const profile = { availableNow: status.available, coarseCity: status.coarseCity, availabilityExpiresAt: status.availableExpiresAt };
        setIsAvailable(Boolean(profile.availableNow));
        if (profile?.coarseCity) {
          const cCity = typeof profile.coarseCity === "object"
            ? (profile.coarseCity.nameEn || profile.coarseCity.name || "Kochi")
            : String(profile.coarseCity);
          setCurrentCity(cCity);
        } else if (profile?.city) {
          const cCity = typeof profile.city === "object"
            ? (profile.city.nameEn || profile.city.name || "Kochi")
            : String(profile.city);
          setCurrentCity(cCity);
        }
        if (profile?.availabilityExpiresAt) setExpiresAt(profile.availabilityExpiresAt);
      } catch (err) {
        // offline
      }
    }
    loadStatus();
  }, []);

  const getRemainingTimeText = () => {
    if (!expiresAt) return isMl ? "7 ദിവസങ്ങൾ" : "7 days";
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return isMl ? "കാലഹരണപ്പെട്ടു" : "Expired";
    const days = Math.floor(diff / (24 * 3600 * 1000));
    const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
    if (days > 0) return `${days}d ${hours}h ${isMl ? "ബാക്കി" : "remaining"}`;
    const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m ${isMl ? "ബാക്കി" : "remaining"}`;
  };

  const handleReconfirm = async () => {
    setLoading(true);
    try {
      const res = await crewService.toggleAvailability({ availableNow: true });
      setExpiresAt(res?.availableExpiresAt || null);
      toast.success(
        isMl ? "നിങ്ങളുടെ ലഭ്യത അടുത്ത 7 ദിവസത്തേക്ക് കൂടി നീട്ടിയിരിക്കുന്നു." : "Your availability window has been extended for another 7 days.",
        isMl ? "ലഭ്യത സ്ഥിരീകരിച്ചു" : "Availability Extended"
      );
    } catch (err) {
      toast.error(err.message || "Failed to reconfirm", isMl ? "പിശക്" : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (targetState) => {
    setLoading(true);
    try {
      if (targetState) {
        const safeOverride = typeof selectedCityOverride === "object"
          ? (selectedCityOverride.nameEn || selectedCityOverride.name || "Kochi")
          : String(selectedCityOverride || "Kochi");

        // Obtain coarse location (rounded to 2 decimal places for privacy)
        const loc = await locationService.getCoarseLocation(safeOverride);
        const resolvedCity = typeof loc.coarseCity === "object"
          ? (loc.coarseCity.nameEn || loc.coarseCity.name || safeOverride)
          : String(loc.coarseCity || safeOverride);

        const res = await crewService.toggleAvailability({
          availableNow: true,
          coarseLat: loc.coarseLat,
          coarseLng: loc.coarseLng,
          coarseCity: resolvedCity,
        });

        setIsAvailable(true);
        setCurrentCity(resolvedCity);
        setExpiresAt(res?.availableExpiresAt || null);

        toast.success(
          isMl
            ? `${resolvedCity}-ലെ റിക്രൂട്ടർമാർക്ക് നിങ്ങൾ ദൃശ്യമാണ്.`
            : `You are visible to recruiters in ${resolvedCity}. Only coarse city is shared.`,
          isMl ? "ലഭ്യത ഓൺ ചെയ്തു" : "Availability On"
        );
      } else {
        await crewService.toggleAvailability({
          availableNow: false,
        });

        setIsAvailable(false);
        setExpiresAt(null);

        toast.info(
          isMl
            ? "അടിയന്തര തിരയലുകളിൽ നിങ്ങളുടെ പ്രൊഫൈൽ ഇനി ദൃശ്യമാകില്ല."
            : "Your profile is no longer shown in urgent active searches.",
          isMl ? "ലഭ്യത ഓഫ് ചെയ്തു" : "Availability Turned Off"
        );
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || "Failed to update availability";
      toast.error(msg, isMl ? "പിശക്" : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title={t ? t("crew.sevenDayWindow", "Active Availability (7-Day Window)") : "Active Availability (7-Day Window)"}
        subtitle={t ? t("crew.networkSubtitle", "Kerala Urgent Dispatch") : "Kerala Urgent Dispatch"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <Card
          style={[
            styles.statusCard,
            isAvailable ? styles.activeCard : styles.inactiveCard,
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.statusDot,
                  isAvailable ? styles.dotActive : styles.dotInactive,
                ]}
              />
              <Text style={styles.statusLabel}>
                {isAvailable
                  ? (t ? t("crew.broadcastingAvailable", "BROADCASTING AVAILABLE") : "BROADCASTING AVAILABLE")
                  : (t ? t("crew.currentlyOfflineUpper", "CURRENTLY OFFLINE") : "CURRENTLY OFFLINE")}
              </Text>
            </View>
            <Badge
              label={isAvailable ? (t ? t("crew.live", "LIVE") : "LIVE") : (t ? t("crew.standby", "STANDBY") : "STANDBY")}
              variant={isAvailable ? "green" : "neutral"}
              size="sm"
            />
          </View>

          {isAvailable && (
            <View style={styles.activeDetails}>
              <View style={styles.detailItem}>
                <ClockIcon size={16} color={Colors.accent.amber} />
                <Text style={styles.detailText}>
                  {t ? t("crew.activeRemaining", "Remaining: ") : "Remaining: "}
                  {getRemainingTimeText()}
                  {expiresAt ? ` (${new Date(expiresAt).toLocaleDateString()})` : ""}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <MapPinIcon size={16} color={Colors.accent.amber} />
                <Text style={styles.detailText}>
                  {t ? t("crew.coarseLocation", "Coarse Location: ") : "Coarse Location: "}
                  {cityDisplay} (~1.1km)
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.explanation}>
            {isAvailable
              ? (t ? t("crew.availActiveExplanation", "Recruiters searching for urgent call times in your district can ping you directly. Active for 7 days unless turned off or reconfirmed.") : "Recruiters searching for urgent call times in your district can ping you directly. Active for 7 days unless turned off or reconfirmed.")
              : (t ? t("crew.availInactiveExplanation", "When you have open dates or sudden cancellations, turn this on to receive urgent booking inquiries from verified Kerala recruiters for the next 7 days.") : "When you have open dates or sudden cancellations, turn this on to receive urgent booking inquiries from verified Kerala recruiters for the next 7 days.")}
          </Text>

          {isAvailable && (
            <Button
              title={loading ? (t ? t("common.loading", "Updating...") : "Updating...") : (t ? t("crew.reconfirmAvailability", "Reconfirm Availability (+7 Days)") : "Reconfirm Availability (+7 Days)")}
              variant="outline"
              size="default"
              loading={loading}
              onPress={handleReconfirm}
              style={{ marginBottom: 10 }}
            />
          )}

          <Button
            title={
              loading
                ? (t ? t("common.loading", "Updating...") : "Updating...")
                : isAvailable
                ? (t ? t("crew.turnOffAvailability", "Turn Off Availability") : "Turn Off Availability")
                : (t ? t("crew.broadcastAvailableBtn", "Broadcast as Available (7 Days)") : "Broadcast as Available (7 Days)")
            }
            variant={isAvailable ? "danger" : "primary"}
            size="lg"
            loading={loading}
            onPress={() => handleToggle(!isAvailable)}
            style={styles.toggleBtn}
          />
        </Card>

        {/* Manual City Fallback Selection */}
        {!isAvailable && (
          <Card style={styles.card}>
            <Text style={styles.subHeading}>
              {t ? t("crew.broadcastHub", "Broadcast Location Hub") : "Broadcast Location Hub"}
            </Text>
            <Text style={styles.subText}>
              {t ? t("crew.broadcastHubDesc", "Select the Kerala city/district where you are currently positioned or ready to travel:") : "Select the Kerala city/district where you are currently positioned or ready to travel:"}
            </Text>

            <View style={styles.cityPillWrap}>
              {LAUNCH_CITIES.map((c, idx) => {
                const cityLabel = typeof c === "object" ? (isMl ? (c.nameMl || c.nameEn) : (c.nameEn || c.name)) : String(c);
                const cityValue = typeof c === "object" ? (c.nameEn || c.name) : String(c);
                const cityKey = typeof c === "object" ? (c.id || c.nameEn || `hub_${idx}`) : `hub_${idx}_${c}`;
                const currentVal = typeof selectedCityOverride === "object" ? (selectedCityOverride.nameEn || selectedCityOverride.name) : selectedCityOverride;
                const isSelected = currentVal === cityValue || currentVal === cityLabel;
                return (
                  <TouchableOpacity
                    key={cityKey}
                    onPress={() => setSelectedCityOverride(cityValue)}
                    style={[
                      styles.cityPill,
                      isSelected && styles.selectedCityPill,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.7}
                      style={[
                        styles.cityPillText,
                        isSelected && styles.selectedCityPillText,
                      ]}
                    >
                      {cityLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        {/* Privacy Note */}
        <Card style={styles.privacyCard}>
          <View style={styles.privacyHeaderRow}>
            <LockIcon size={16} color={Colors.accent.amber} />
            <Text style={styles.privacyHeading}>
              {t ? t("crew.privacyProtectionTitle", "Privacy Protection by Design") : "Privacy Protection by Design"}
            </Text>
          </View>
          <Text style={styles.privacyBody}>
            {t ? t("crew.privacyProtectionDesc", "Exact GPS is never stored or shared; your location is coarsely rounded (~1.1km) and active only during your 18-hour window. Coordinates are wiped immediately when turned off.") : "Exact GPS is never stored or shared; your location is coarsely rounded (~1.1km) and active only during your 18-hour window. Coordinates are wiped immediately when turned off."}
          </Text>
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
  statusCard: {
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  activeCard: {
    borderColor: Colors.accent.amber,
    backgroundColor: "rgba(245, 166, 35, 0.08)",
  },
  inactiveCard: {
    borderColor: Colors.border.subtle,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
  dotActive: {
    backgroundColor: Colors.semantic.success,
  },
  dotInactive: {
    backgroundColor: Colors.text.muted,
  },
  statusLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  activeDetails: {
    backgroundColor: Colors.surface.raised,
    padding: 12,
    borderRadius: Radius.md,
    gap: 8,
    marginBottom: 14,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  explanation: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  toggleBtn: {
    width: "100%",
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  subHeading: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  cityPillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "stretch",
  },
  cityPill: {
    flex: 1,
    minWidth: 90,
    height: 48,
    paddingHorizontal: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.raised,
    borderWidth: 1.5,
    borderColor: Colors.border.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCityPill: {
    borderColor: Colors.accent.amber,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
  },
  cityPillText: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  selectedCityPillText: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.bold,
  },
  privacyCard: {
    padding: 16,
  },
  privacyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  privacyHeading: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  privacyBody: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});

export default AvailabilityScreen;

