/**
 * apps/mobile/src/screens/crew/CitySelectionScreen.js
 * Final onboarding step for crew: Name, Kerala city/district, and 30s profile creation.
 */

import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Input from "../../components/common/Input.js";
import Button from "../../components/common/Button.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import { LAUNCH_CITIES, KERALA_DISTRICTS } from "@crew-hive/shared";
import { crewService } from "../../services/crewService.js";
import { taxonomyService } from "../../services/taxonomyService.js";
import { toast } from "../../components/common/Toast.js";

export function CitySelectionScreen({
  navigation,
  route,
  language = "en",
  onToggleLanguage,
  t,
}) {
  const phone = route?.params?.phone || "";
  const consentVersion = route?.params?.consentVersion || "1.0";
  const primaryRole = route?.params?.primaryRole || "sound";
  const roles = route?.params?.roles || [primaryRole];
  const isMl = language === "ml";

  const [launchCities, setLaunchCities] = useState(LAUNCH_CITIES);
  const [districts, setDistricts] = useState(KERALA_DISTRICTS);
  const [name, setName] = useState("");
  const [selectedCity, setSelectedCity] = useState("Kochi");
  const [associationCode, setAssociationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadCities() {
      try {
        const data = await taxonomyService.getCities();
        if (isMounted) {
          if (Array.isArray(data.launchCities) && data.launchCities.length > 0) {
            setLaunchCities(data.launchCities);
          }
          if (Array.isArray(data.districts) && data.districts.length > 0) {
            setDistricts(data.districts);
          }
        }
      } catch (err) {
        console.warn("[CitySelectionScreen] Using offline cities:", err.message);
      }
    }
    loadCities();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleComplete = async () => {
    if (!name.trim()) {
      setError("Please enter your professional name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await crewService.onboard({
        name: name.trim(),
        primaryRole,
        roles,
        city: selectedCity,
        consentVersion,
        associationCode: associationCode.trim() || undefined,
      });

      navigation.navigate("OnboardingSuccess", {
        role: "crew",
        name: name.trim(),
        city: selectedCity,
      });
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        "Failed to create profile. Please check your connection.";
      setError(msg);
      toast.error(msg, isMl ? "ഓൺബോർഡിംഗ് പിശക്" : "Onboarding Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isMl ? "നഗരവും വിവരങ്ങളും" : "Base Location & Details"}
        subtitle={isMl ? "ഘട്ടം 4 / 4: അവസാന ഘട്ടം" : "Step 4 of 4: Final Step"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introBox}>
          <Text style={styles.title}>
            {isMl ? "നിങ്ങൾ ഏത് നഗരത്തിലാണ്?" : "Where are you based?"}
          </Text>
          <Text style={styles.subtitle}>
            {isMl
              ? "യാത്രാ സമയം കുറയ്ക്കാനും പ്രാദേശിക ക്രൂവിനെ കണ്ടെത്താനും റിക്രൂട്ടർമാർ നഗരം അടിസ്ഥാനമാക്കി തിരയുന്നു."
              : "Recruiters filter local technicians to minimize travel call times and logistics."}
          </Text>
        </View>

        <Input
          label={isMl ? "നിങ്ങളുടെ പേര് *" : "Your Professional Name *"}
          placeholder={isMl ? "ഉദാ: രാഹുൽ മേനോൻ" : "e.g. Rahul Menon"}
          value={name}
          onChangeText={(txt) => {
            setName(txt);
            if (error) setError("");
          }}
          error={error}
        />

        {/* Launch Priority Hubs */}
        <Text style={styles.sectionHeading}>
          {isMl ? "പ്രധാന നഗരങ്ങൾ" : "LAUNCH PRIORITY HUBS"}
        </Text>
        <View style={styles.cityRow}>
          {launchCities.map((city, idx) => {
            const cityLabel = typeof city === "object" ? (isMl ? (city.nameMl || city.nameEn) : (city.nameEn || city.name)) : String(city);
            const cityValue = typeof city === "object" ? (city.nameEn || city.name) : String(city);
            const cityKey = typeof city === "object" ? (city.id || city.nameEn || `city_${idx}`) : `city_${idx}_${city}`;
            const isSelected = selectedCity === cityValue;
            return (
              <TouchableOpacity
                key={cityKey}
                activeOpacity={0.8}
                onPress={() => setSelectedCity(cityValue)}
                style={[
                  styles.cityChip,
                  isSelected && styles.selectedCityChip,
                ]}
              >
                <Text
                  style={[
                    styles.cityChipText,
                    isSelected && styles.selectedCityChipText,
                  ]}
                >
                  {cityLabel}
                </Text>
                {isSelected && (
                  <Badge
                    label={isMl ? "തിരഞ്ഞെടുത്തു" : "ACTIVE"}
                    variant="amber"
                    size="sm"
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* All Kerala Districts */}
        <Text style={styles.sectionHeading}>
          {isMl ? "എല്ലാ കേരള ജില്ലകളും" : "ALL KERALA DISTRICTS"}
        </Text>
        <Card style={styles.districtsCard}>
          <View style={styles.districtWrap}>
            {districts.map((district, idx) => {
              const districtLabel = typeof district === "object" ? (isMl ? (district.nameMl || district.nameEn) : (district.nameEn || district.name)) : String(district);
              const districtValue = typeof district === "object" ? (district.nameEn || district.name) : String(district);
              const districtKey = typeof district === "object" ? (district.id || district.nameEn || `dist_${idx}`) : `dist_${idx}_${district}`;
              const isSelected = selectedCity === districtValue;
              return (
                <TouchableOpacity
                  key={districtKey}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCity(districtValue)}
                  style={[
                    styles.districtPill,
                    isSelected && styles.selectedDistrictPill,
                  ]}
                >
                  <Text
                    style={[
                      styles.districtPillText,
                      isSelected && styles.selectedDistrictPillText,
                    ]}
                  >
                    {districtLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Association Code (Optional) */}
        <Input
          label={
            isMl
              ? "ഓപ്ഷണൽ: അസോസിയേഷൻ / ഗിൽഡ് മെമ്പർ കോഡ്"
              : "Optional: Association / Guild Member Code"
          }
          placeholder="e.g. FEFKA-SND-1042 or KEA-884"
          value={associationCode}
          onChangeText={setAssociationCode}
          helperText={
            isMl
              ? "അംഗീകൃത AV ഗിൽഡുകളിലെ അംഗങ്ങൾക്ക് വെരിഫൈഡ് ട്രേഡ് ബാഡ്ജ് ലഭിക്കും."
              : "Members of recognized AV guilds receive a verified trade badge."
          }
        />

        <View style={styles.actionArea}>
          <Button
            title={
              loading
                ? (isMl ? "പ്രൊഫൈൽ നിർമ്മിക്കുന്നു..." : "Creating Profile...")
                : (isMl ? "30 സെക്കൻഡിൽ പൂർത്തിയാക്കുക" : "Complete Profile in 30s")
            }
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleComplete}
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
  sectionHeading: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.amber,
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 10,
  },
  cityRow: {
    gap: 8,
    marginBottom: 16,
  },
  cityChip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface.card,
    borderWidth: 1.5,
    borderColor: Colors.border.subtle,
  },
  selectedCityChip: {
    borderColor: Colors.accent.amber,
    backgroundColor: Colors.surface.raised,
  },
  cityChipText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
  },
  selectedCityChipText: {
    color: Colors.accent.amber,
  },
  districtsCard: {
    padding: 14,
    marginBottom: 16,
  },
  districtWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  districtPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.raised,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  selectedDistrictPill: {
    borderColor: Colors.accent.amber,
    backgroundColor: "rgba(245, 166, 35, 0.2)",
  },
  districtPillText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  selectedDistrictPillText: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.bold,
  },
  actionArea: {
    marginTop: 24,
  },
});

export default CitySelectionScreen;

