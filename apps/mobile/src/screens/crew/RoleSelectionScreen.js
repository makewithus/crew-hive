/**
 * apps/mobile/src/screens/crew/RoleSelectionScreen.js
 * 10-parent role taxonomy selection with hardware-accurate AV craft icons and live API fetching for crew onboarding.
 */

import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Button from "../../components/common/Button.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import { getCraftIcon } from "../../components/common/AvIcons.js";
import { PARENT_ROLES } from "@crew-hive/shared";
import { taxonomyService, normalizeRoles } from "../../services/taxonomyService.js";
import { toast } from "../../components/common/Toast.js";

const MAX_SPECIALTIES = 3;

export function RoleSelectionScreen({
  navigation,
  route,
  language = "en",
  onToggleLanguage,
  t,
}) {
  const phone = route?.params?.phone || "";
  const consentVersion = route?.params?.consentVersion || "1.0";
  const isMl = language === "ml";

  // Initialize immediately with normalized shared roles for zero layout shift
  const [roles, setRoles] = useState(() => normalizeRoles(PARENT_ROLES, language));
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [primaryRole, setPrimaryRole] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch live taxonomy from API, falling back to shared package
  useEffect(() => {
    let isMounted = true;
    async function loadRoles() {
      try {
        setLoading(true);
        const liveRoles = await taxonomyService.getRoles(language);
        if (isMounted && Array.isArray(liveRoles) && liveRoles.length > 0) {
          setRoles(liveRoles);
        }
      } catch (err) {
        console.warn("[RoleSelectionScreen] Using offline role taxonomy:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRoles();
    return () => {
      isMounted = false;
    };
  }, [language]);

  const toggleRole = (roleId) => {
    if (selectedRoles.includes(roleId)) {
      const filtered = selectedRoles.filter((id) => id !== roleId);
      setSelectedRoles(filtered);
      if (primaryRole === roleId) {
        setPrimaryRole(filtered[0] || null);
      }
    } else {
      if (selectedRoles.length >= MAX_SPECIALTIES) {
        toast.warning(
          isMl
            ? `പരമാവധി ${MAX_SPECIALTIES} വിഭാഗങ്ങൾ മാത്രമേ തിരഞ്ഞെടുക്കാൻ സാധിക്കൂ.`
            : `You can select up to ${MAX_SPECIALTIES} primary specialties.`,
          isMl ? "പരമാവധി പരിധി" : "Maximum Reached"
        );
        return;
      }
      const updated = [...selectedRoles, roleId];
      setSelectedRoles(updated);
      if (!primaryRole) {
        setPrimaryRole(roleId);
      }
    }
  };

  const handleContinue = () => {
    if (selectedRoles.length === 0) return;

    navigation.navigate("CitySelection", {
      phone,
      consentVersion,
      primaryRole: primaryRole || selectedRoles[0],
      roles: selectedRoles,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isMl ? "തൊഴിൽ വിഭാഗം" : "Select Your AV Craft"}
        subtitle={isMl ? "ഘട്ടം 3 / 4: റോൾ ടാക്സോണമി" : "Step 3 of 4: Role Taxonomy"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introBox}>
          <Text style={styles.title}>
            {isMl ? "നിങ്ങളുടെ പ്രധാന തൊഴിൽ ഏതാണ്?" : "What is your primary trade?"}
          </Text>
          <Text style={styles.subtitle}>
            {isMl
              ? `പരമാവധി ${MAX_SPECIALTIES} വിഭാഗങ്ങൾ തിരഞ്ഞെടുക്കുക. ഇവന്റ് റിക്രൂട്ടർമാർ ഈ വിഭാഗങ്ങൾ വഴിയാണ് തിരയുന്നത്.`
              : `Choose up to ${MAX_SPECIALTIES} specialties. Kerala event recruiters search specifically by these standardized parent crafts.`}
          </Text>
        </View>

        <View style={styles.grid}>
          {roles.map((role, idx) => {
            const roleId = role.id || role.roleId || role.slug || `role_${idx}`;
            const isSelected = selectedRoles.includes(roleId);
            const isPrimary = primaryRole === roleId;
            const roleName = isMl
              ? role.nameMl || role.nameEn || role.name || "Specialist"
              : role.nameEn || role.name || "Specialist";
            const subCount = role.subroleCount ?? role.specialisations?.length ?? role.subroles?.length ?? 0;

            return (
              <TouchableOpacity
                key={roleId}
                activeOpacity={0.8}
                onPress={() => toggleRole(roleId)}
                style={styles.cardWrapper}
                accessibilityRole="button"
                accessibilityLabel={`${roleName}, ${subCount} sub-specializations`}
                accessibilityState={{ selected: isSelected }}
              >
                <Card
                  style={[
                    styles.roleCard,
                    isSelected && styles.selectedCard,
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View
                      style={[
                        styles.iconCircle,
                        isSelected && styles.selectedIconCircle,
                      ]}
                    >
                      {getCraftIcon(roleId, {
                        size: 26,
                        color: isSelected ? Colors.accent.amber : Colors.text.muted,
                      })}
                    </View>
                    {isPrimary && (
                      <Badge
                        label={isMl ? "പ്രധാനം" : "PRIMARY"}
                        variant="amber"
                        size="sm"
                      />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.roleName,
                      isSelected && styles.selectedRoleName,
                    ]}
                    numberOfLines={2}
                  >
                    {roleName}
                  </Text>
                  <Text style={styles.subroleCount}>
                    {subCount} {isMl ? "ഉപവിഭാഗങ്ങൾ" : `sub-specialization${subCount === 1 ? "" : "s"}`}
                  </Text>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.selectionCount}>
            {selectedRoles.length} / {MAX_SPECIALTIES}{" "}
            {isMl
              ? "വിഭാഗങ്ങൾ തിരഞ്ഞെടുത്തു"
              : `craft${selectedRoles.length === 1 ? "" : "s"} selected`}
          </Text>
          <Button
            title={isMl ? "തുടരുക" : "Continue to Location"}
            variant="primary"
            size="lg"
            disabled={selectedRoles.length === 0}
            onPress={handleContinue}
          />
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
    paddingBottom: 24,
  },
  introBox: {
    marginBottom: 20,
  },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  cardWrapper: {
    width: "48%",
  },
  roleCard: {
    padding: 14,
    minHeight: 140,
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: Colors.border.subtle,
  },
  selectedCard: {
    borderColor: Colors.accent.amber,
    backgroundColor: Colors.surface.raised,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.raised,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedIconCircle: {
    backgroundColor: "rgba(245, 166, 35, 0.15)",
  },
  roleName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
    marginTop: 8,
    marginBottom: 2,
    lineHeight: 18,
  },
  selectedRoleName: {
    color: Colors.accent.amber,
  },
  subroleCount: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
  },
  footer: {
    marginTop: 28,
  },
  selectionCount: {
    textAlign: "center",
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
});

export default RoleSelectionScreen;
