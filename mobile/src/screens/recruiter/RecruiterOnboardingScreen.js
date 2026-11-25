/**
 * apps/mobile/src/screens/recruiter/RecruiterOnboardingScreen.js
 * Recruiter registration: Production company name, contact person, primary Kerala city.
 */

import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Input from "../../components/common/Input.js";
import Button from "../../components/common/Button.js";
import { LockIcon } from "../../components/common/AvIcons.js";
import { LAUNCH_CITIES, KERALA_DISTRICTS } from "@crew-hive/shared";
import { recruiterService } from "../../services/recruiterService.js";
import { toast } from "../../components/common/Toast.js";

export function RecruiterOnboardingScreen({ navigation, route, language, onToggleLanguage, t }) {
  const phone = route?.params?.phone || "";
  const consentVersion = route?.params?.consentVersion || "1.0";

  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [city, setCity] = useState("Kochi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleComplete = async () => {
    if (!companyName.trim()) {
      setError(t ? t("recruiter.enterCompanyName", "Please enter your company or production house name") : "Please enter your company or production house name");
      return;
    }
    if (!contactPerson.trim()) {
      setError(t ? t("recruiter.enterContactPerson", "Please enter the contact person's name") : "Please enter the contact person's name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await recruiterService.onboard({
        companyName: companyName.trim(),
        name: contactPerson.trim(),
        city,
        consentVersion,
      });

      navigation.navigate("OnboardingSuccess", {
        role: "recruiter",
        name: contactPerson.trim(),
        city,
      });
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        "Failed to create recruiter profile";
      setError(msg);
      toast.error(msg, t ? t("recruiter.registrationError", "Registration Error") : "Registration Error");
    } finally {
      setLoading(false);
    }
  };

  const isMl = language === "ml";

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t ? t("recruiter.onboardingTitle", "Recruiter Registration") : "Recruiter Registration"}
        subtitle={t ? t("recruiter.sourcingSubtitle", "HIRE VERIFIED KERALA AV CREW") : "HIRE VERIFIED KERALA AV CREW"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introBox}>
          <Text style={styles.title}>
            {t ? t("recruiter.companyInfo", "Company & Contact Information") : "Company & Contact Information"}
          </Text>
          <Text style={styles.subtitle}>
            {t ? t("recruiter.companyInfoDesc", "Event production houses, agencies, and directors use CrewHive to source verified technicians with 0% recruiter fees.") : "Event production houses, agencies, and directors use CrewHive to source verified technicians with 0% recruiter fees."}
          </Text>
        </View>

        <Input
          label={t ? t("recruiter.companyPrompt", "Company / Production House Name *") : "Company / Production House Name *"}
          placeholder={t ? t("recruiter.companyPlaceholder", "e.g. Cochin Media Productions or Freelance Director") : "e.g. Cochin Media Productions or Freelance Director"}
          value={companyName}
          onChangeText={(txt) => {
            setCompanyName(txt);
            if (error) setError("");
          }}
          error={error && !companyName.trim() ? error : ""}
        />

        <Input
          label={t ? t("recruiter.contactPerson", "Contact Person Name *") : "Contact Person Name *"}
          placeholder={t ? t("recruiter.contactPlaceholder", "e.g. Arun Nair") : "e.g. Arun Nair"}
          value={contactPerson}
          onChangeText={(txt) => {
            setContactPerson(txt);
            if (error) setError("");
          }}
          error={error && !contactPerson.trim() ? error : ""}
        />

        <Text style={styles.sectionHeading}>
          {t ? t("recruiter.primaryBase", "PRIMARY BASE IN KERALA") : "PRIMARY BASE IN KERALA"}
        </Text>
        <View style={styles.cityPills}>
          {LAUNCH_CITIES.map((c, idx) => {
            const cityLabel = typeof c === "object" ? (isMl ? (c.nameMl || c.nameEn) : (c.nameEn || c.name)) : String(c);
            const cityValue = typeof c === "object" ? (c.nameEn || c.name) : String(c);
            const cityKey = typeof c === "object" ? (c.id || c.nameEn || `rec_city_${idx}`) : `rec_city_${idx}_${c}`;
            const isSelected = city === cityValue || city === cityLabel;
            return (
              <TouchableOpacity
                key={cityKey}
                activeOpacity={0.8}
                onPress={() => setCity(cityValue)}
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
                    styles.cityText,
                    isSelected && styles.selectedCityText,
                  ]}
                >
                  {cityLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.termsNote}>
          <LockIcon size={14} color={Colors.accent.amber} />
          <Text style={styles.termsText}>
            {t ? t("recruiter.termsNotice", "By proceeding, you agree to treat crew contact disclosures professionally and adhere to Kerala audio-visual industry wage norms.") : "By proceeding, you agree to treat crew contact disclosures professionally and adhere to Kerala audio-visual industry wage norms."}
          </Text>
        </View>

        <Button
          title={loading ? (t ? t("common.loading", "Registering...") : "Registering...") : (t ? t("recruiter.completeSetup", "Complete Recruiter Setup") : "Complete Recruiter Setup")}
          variant="primary"
          size="lg"
          loading={loading}
          onPress={handleComplete}
          style={styles.actionBtn}
        />
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
    marginTop: 14,
    marginBottom: 10,
  },
  cityPills: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    alignItems: "stretch",
  },
  cityPill: {
    flex: 1,
    height: 52,
    paddingHorizontal: 4,
    paddingVertical: 8,
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
  cityText: {
    fontSize: 13,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  selectedCityText: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.bold,
  },
  termsNote: {
    backgroundColor: Colors.surface.raised,
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  termsText: {
    flex: 1,
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: 8,
  },
});

export default RecruiterOnboardingScreen;

