/**
 * apps/mobile/src/screens/recruiter/CrewSearchScreen.js
 * Comprehensive crew search with 10 parent role taxonomy, city filter, and availability toggle.
 */

import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, Switch, RefreshControl, Modal, TextInput } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import Button from "../../components/common/Button.js";
import EmptyState from "../../components/common/EmptyState.js";
import { getCraftIcon, MapPinIcon } from "../../components/common/AvIcons.js";
import { PARENT_ROLES, LAUNCH_CITIES, KERALA_DISTRICTS, findRoleOrSpecialisation } from "@crew-hive/shared";
import { recruiterService } from "../../services/recruiterService.js";

export function CrewSearchScreen({ navigation, language, onToggleLanguage, t }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [availableOnly, setAvailableOnly] = useState(false);

  // F5: Advanced filters state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [selectedExperience, setSelectedExperience] = useState(null);
  const [minRate, setMinRate] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const [specialisation, setSpecialisation] = useState("");

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isMl = language === "ml";

  const activeFilterCount =
    (selectedLanguages.length ? 1 : 0) +
    (selectedExperience ? 1 : 0) +
    (minRate || maxRate ? 1 : 0) +
    (specialisation ? 1 : 0);

  const search = useCallback(async () => {
    try {
      const data = await recruiterService.searchCrew({
        role: selectedRole || undefined,
        city: selectedCity || undefined,
        availableOnly,
        language: selectedLanguages.length ? selectedLanguages.join(",") : undefined,
        experience: selectedExperience || undefined,
        minRate: minRate ? Number(minRate) : undefined,
        maxRate: maxRate ? Number(maxRate) : undefined,
        specialisation: specialisation ? specialisation.trim() : undefined,
      });
      setResults(data || []);
    } catch (err) {
      // offline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRole, selectedCity, availableOnly, selectedLanguages, selectedExperience, minRate, maxRate, specialisation]);

  useEffect(() => {
    search();
  }, [search]);

  const handleRefresh = () => {
    setRefreshing(true);
    search();
  };

  const renderCrewCard = ({ item }) => {
    const isAvail = Boolean(item.availableNow);
    const dayRateText =
      item.showDayRate && item.dayRate
        ? `₹${Number(item.dayRate).toLocaleString("en-IN")} ${t ? t("common.day", "/ day") : "/ day"}`
        : (t ? t("common.rateOnRequest", "Rate on request") : "Rate on request");

    const craftLookup = item.primaryRole ? findRoleOrSpecialisation(item.primaryRole, language) : null;
    const craftTitle = (craftLookup?.label || (item.primaryRole || "Technician")).replace(/_/g, " ").toUpperCase();

    const rawCity = typeof item.city === "object" ? (item.city.nameEn || item.city.name || "Kochi") : (item.city || "Kochi");
    const cityMatch =
      LAUNCH_CITIES.find((c) => (c.nameEn || c.name || "").toLowerCase() === String(rawCity).toLowerCase()) ||
      KERALA_DISTRICTS.find((d) => (d.nameEn || d.name || "").toLowerCase() === String(rawCity).toLowerCase());
    const cityDisplay = isMl ? (cityMatch?.nameMl || rawCity) : (cityMatch?.nameEn || rawCity);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate("CrewDetail", { crewId: item.id, crew: item })}
      >
        <Card style={styles.crewCard}>
          <View style={styles.cardTop}>
            <View style={styles.craftIconCircle}>
              {getCraftIcon(item.primaryRole || "sound_engineer", {
                size: 24,
                color: Colors.accent.amber,
              })}
            </View>

            <View style={styles.infoCol}>
              <View style={styles.nameRow}>
                <Text style={styles.crewName} numberOfLines={1}>{item.name}</Text>
                {item.associationCode && (
                  <Badge label={isMl ? "സ്ഥിരീകരിച്ച അംഗം" : "VERIFIED GUILD"} variant="amber" size="sm" />
                )}
              </View>

              <Text style={styles.craftTitle} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.85}>
                {craftTitle}
              </Text>

              <View style={styles.locationRow}>
                <MapPinIcon size={12} color={Colors.text.muted} />
                <Text style={styles.locationText}>{cityDisplay}</Text>
              </View>
            </View>

            <View style={styles.statusCol}>
              <Badge
                label={isAvail ? (isMl ? "ലഭ്യമാണ്" : "AVAILABLE NOW") : (isMl ? "സ്റ്റാൻഡ്‌ബൈ" : "STANDBY")}
                variant={isAvail ? "green" : "neutral"}
                size="sm"
              />
              <Text style={styles.rateText}>{dayRateText}</Text>
            </View>
          </View>

          {item.bio && (
            <Text style={styles.bioSnippet} numberOfLines={2}>
              {item.bio}
            </Text>
          )}

          <View style={styles.cardActions}>
            <Button
              title={isMl ? "പ്രൊഫൈൽ കാണുക & ബന്ധപ്പെടുക" : "View Profile & Inquire"}
              variant="outline"
              size="sm"
              onPress={() => navigation.navigate("CrewDetail", { crewId: item.id, crew: item })}
              style={{ width: "100%" }}
            />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title={isMl ? "ക്രൂവിനെ തിരയുക" : "Find AV Crew"}
        subtitle={isMl ? "10 പ്രധാന സാങ്കേതിക വിഭാഗങ്ങൾ" : "Standardized 10-Role Kerala Taxonomy"}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <View style={styles.filtersSection}>
        {/* Availability Toggle Filter */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleTextWrap}>
            <View style={[styles.pulse, availableOnly ? styles.pulseGreen : styles.pulseMuted]} />
            <Text style={styles.toggleLabel}>
              {isMl ? "ഇപ്പോൾ ലഭ്യമായവർ മാത്രം (18h ലൈവ്)" : "Available Now Only (18h active)"}
            </Text>
          </View>
          <Switch
            value={availableOnly}
            onValueChange={setAvailableOnly}
            trackColor={{ false: Colors.surface.raised, true: Colors.accent.amber }}
            thumbColor={Colors.text.primary}
          />
        </View>

        {/* Parent Role Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          <TouchableOpacity
            onPress={() => setSelectedRole(null)}
            style={[
              styles.chip,
              selectedRole === null && styles.activeChip,
            ]}
          >
            <Text style={[styles.chipText, selectedRole === null && styles.activeChipText]}>
              {isMl ? "എല്ലാ വിഭാഗങ്ങളും" : "All Crafts"}
            </Text>
          </TouchableOpacity>

          {PARENT_ROLES.map((r) => {
            const isActive = selectedRole === r.id;
            const roleName = isMl ? (r.nameMl || r.nameEn || r.name) : (r.nameEn || r.name);
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => setSelectedRole(isActive ? null : r.id)}
                style={[
                  styles.chip,
                  isActive && styles.activeChip,
                ]}
              >
                <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                  {roleName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* City Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipsScroll, { paddingTop: 6 }]}
        >
          <TouchableOpacity
            onPress={() => setSelectedCity(null)}
            style={[
              styles.cityChip,
              selectedCity === null && styles.activeCityChip,
            ]}
          >
            <Text style={[styles.cityChipText, selectedCity === null && styles.activeCityChipText]}>
              {isMl ? "എല്ലാ ജില്ലകളും" : "All Kerala"}
            </Text>
          </TouchableOpacity>

          {LAUNCH_CITIES.map((c, idx) => {
            const cityLabel = typeof c === "object" ? (isMl ? (c.nameMl || c.nameEn) : (c.nameEn || c.name)) : String(c);
            const cityValue = typeof c === "object" ? (c.nameEn || c.name) : String(c);
            const cityKey = typeof c === "object" ? (c.id || c.nameEn || `srch_city_${idx}`) : `srch_city_${idx}_${c}`;
            const isActive = selectedCity === cityValue || selectedCity === cityLabel;
            return (
              <TouchableOpacity
                key={cityKey}
                onPress={() => setSelectedCity(isActive ? null : cityValue)}
                style={[
                  styles.cityChip,
                  isActive && styles.activeCityChip,
                ]}
              >
                <Text style={[styles.cityChipText, isActive && styles.activeCityChipText]}>
                  {cityLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* F5: Advanced Filters Bar */}
        <View style={styles.advFilterBar}>
          <TouchableOpacity
            style={[styles.advFilterBtn, activeFilterCount > 0 && styles.activeAdvFilterBtn]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Text style={[styles.advFilterBtnText, activeFilterCount > 0 && styles.activeAdvFilterBtnText]}>
              ⚙ {isMl ? "കൂടുതൽ ഫിൽട്ടറുകൾ" : "Advanced Filters"}
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Text>
          </TouchableOpacity>

          {activeFilterCount > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSelectedLanguages([]);
                setSelectedExperience(null);
                setMinRate("");
                setMaxRate("");
                setSpecialisation("");
              }}
              style={styles.clearFiltersBtn}
            >
              <Text style={styles.clearFiltersText}>{isMl ? "ക്ലിയർ" : "Reset"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id || String(Math.random())}
        renderItem={renderCrewCard}
        contentContainerStyle={styles.resultsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.accent.amber}
          />
        }
        ListEmptyComponent={
          !loading && (
            <EmptyState
              title={isMl ? "ടെക്നീഷ്യന്മാരെ കണ്ടെത്തിയില്ല" : "No Technicians Found"}
              description={isMl ? "മറ്റ് വിഭാഗങ്ങളോ ജില്ലകളോ തിരഞ്ഞെടുത്ത് വീണ്ടും നോക്കൂ." : "Try selecting 'All Crafts', removing the Available Now filter, or expanding the city filter."}
              actionLabel={isMl ? "ഫിൽട്ടറുകൾ മാറ്റുക" : "Reset Filters"}
              onAction={() => {
                setSelectedRole(null);
                setSelectedCity(null);
                setAvailableOnly(false);
              }}
            />
          )
        }
      />

      {/* Advanced Filters Modal (F5) */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isMl ? "കൂടുതൽ ഫിൽട്ടറുകൾ" : "Advanced Filters"}</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Languages */}
              <Text style={styles.filterSectionTitle}>{isMl ? "സംസാരിക്കുന്ന ഭാഷകൾ" : "Languages"}</Text>
              <View style={styles.modalChipRow}>
                {["Malayalam", "English", "Tamil", "Hindi", "Telugu", "Kannada"].map((lang) => {
                  const isSel = selectedLanguages.includes(lang);
                  return (
                    <TouchableOpacity
                      key={lang}
                      style={[styles.modalChip, isSel && styles.activeModalChip]}
                      onPress={() => {
                        setSelectedLanguages((prev) =>
                          prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
                        );
                      }}
                    >
                      <Text style={[styles.modalChipText, isSel && styles.activeModalChipText]}>{lang}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Experience */}
              <Text style={styles.filterSectionTitle}>{isMl ? "പ്രവർത്തിപരിചയം" : "Experience Level"}</Text>
              <View style={styles.modalChipRow}>
                {["0-2 years", "2-5 years", "5-10 years", "10+ years"].map((exp) => {
                  const isSel = selectedExperience === exp;
                  return (
                    <TouchableOpacity
                      key={exp}
                      style={[styles.modalChip, isSel && styles.activeModalChip]}
                      onPress={() => setSelectedExperience(isSel ? null : exp)}
                    >
                      <Text style={[styles.modalChipText, isSel && styles.activeModalChipText]}>{exp}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Specialisation */}
              <Text style={styles.filterSectionTitle}>{isMl ? "പ്രത്യേക വൈദഗ്ദ്ധ്യം" : "Specialisation"}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. FOH, Moving Heads, Rigging, Drone"
                placeholderTextColor={Colors.text.muted}
                value={specialisation}
                onChangeText={setSpecialisation}
              />

              {/* Day Rate Range */}
              <Text style={styles.filterSectionTitle}>{isMl ? "ദിവസ നിരക്ക് പരിധി (₹)" : "Day Rate Range (₹)"}</Text>
              <View style={styles.rateRow}>
                <TextInput
                  style={[styles.modalInput, { flex: 1, marginRight: 8 }]}
                  placeholder="Min (e.g. 2000)"
                  placeholderTextColor={Colors.text.muted}
                  keyboardType="numeric"
                  value={minRate}
                  onChangeText={setMinRate}
                />
                <TextInput
                  style={[styles.modalInput, { flex: 1 }]}
                  placeholder="Max (e.g. 8000)"
                  placeholderTextColor={Colors.text.muted}
                  keyboardType="numeric"
                  value={maxRate}
                  onChangeText={setMaxRate}
                />
              </View>

              <View style={styles.modalActions}>
                <Button
                  title={isMl ? "റീസെറ്റ്" : "Reset All"}
                  variant="outline"
                  size="md"
                  onPress={() => {
                    setSelectedLanguages([]);
                    setSelectedExperience(null);
                    setMinRate("");
                    setMaxRate("");
                    setSpecialisation("");
                  }}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={isMl ? "ഫിൽട്ടർ ചെയ്യുക" : "Apply Filters"}
                  variant="primary"
                  size="md"
                  onPress={() => setFilterModalVisible(false)}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg.base,
  },
  filtersSection: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
    backgroundColor: Colors.surface.base,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Dimensions.screenPadding,
    paddingBottom: 8,
  },
  toggleTextWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
  },
  pulseGreen: {
    backgroundColor: Colors.semantic.success,
  },
  pulseMuted: {
    backgroundColor: Colors.text.muted,
  },
  toggleLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
  },
  chipsScroll: {
    paddingHorizontal: Dimensions.screenPadding,
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.raised,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  activeChip: {
    backgroundColor: Colors.accent.amber,
    borderColor: Colors.accent.amber,
  },
  chipText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: Colors.text.secondary,
  },
  activeChipText: {
    color: Colors.bg.base,
    fontWeight: Typography.weight.bold,
  },
  cityChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.card,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  activeCityChip: {
    borderColor: Colors.accent.amber,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
  },
  cityChipText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  activeCityChipText: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.semiBold,
  },
  resultsList: {
    padding: Dimensions.screenPadding,
    paddingBottom: 24,
    gap: 14,
  },
  crewCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
  },
  craftIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.raised,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  crewName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  craftTitle: {
    fontSize: Typography.size.xs,
    color: Colors.accent.amber,
    fontWeight: Typography.weight.semiBold,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  statusCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  rateText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
  },
  bioSnippet: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    lineHeight: 18,
    marginTop: 10,
  },
  cardActions: {
    marginTop: 12,
  },
  advFilterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Dimensions.screenPadding,
    paddingTop: 8,
  },
  advFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.raised,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  activeAdvFilterBtn: {
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    borderColor: Colors.accent.amber,
  },
  advFilterBtnText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.secondary,
  },
  activeAdvFilterBtnText: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.bold,
  },
  clearFiltersBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: Typography.size.xs,
    color: Colors.semantic.error,
    fontWeight: Typography.weight.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: Colors.bg.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Dimensions.screenPadding,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  modalTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  modalCloseText: {
    fontSize: Typography.size.lg,
    color: Colors.text.muted,
    padding: 4,
  },
  filterSectionTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.amber,
    marginTop: 12,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  modalChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.raised,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  activeModalChip: {
    borderColor: Colors.accent.amber,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
  },
  modalChipText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  activeModalChipText: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.bold,
  },
  modalInput: {
    backgroundColor: Colors.surface.raised,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text.primary,
    fontSize: Typography.size.xs,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 16,
  },
});

export default CrewSearchScreen;

