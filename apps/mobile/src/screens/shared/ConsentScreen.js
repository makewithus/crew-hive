/**
 * apps/mobile/src/screens/shared/ConsentScreen.js
 * DPDP Versioned Consent capture screen recording acceptance before account finalization.
 */

import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Colors, Radius, Typography } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Button from "../../components/common/Button.js";
import Card from "../../components/common/Card.js";
import { CheckIcon } from "../../components/common/AvIcons.js";
import { CURRENT_CONSENT_VERSION } from "@crew-hive/shared";

export function ConsentScreen({ navigation, route, language, onToggleLanguage, t }) {
  const phone = route?.params?.phone || "";
  const role = route?.params?.role || "crew";
  const [agreed, setAgreed] = useState(false);

  const handleContinue = () => {
    if (!agreed) return;

    if (role === "recruiter") {
      navigation.navigate("RecruiterOnboarding", { phone, consentVersion: CURRENT_CONSENT_VERSION });
    } else {
      navigation.navigate("RoleSelection", { phone, consentVersion: CURRENT_CONSENT_VERSION });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t ? t("auth.consentTitle", "Terms & Fair Platform Code") : "Terms & Fair Platform Code"}
        subtitle={language === "ml" ? "ഘട്ടം 2 / 4" : "Step 2 of 4"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={styles.title}>{t("auth.consentTitle")}</Text>
          <Text style={styles.subtitle}>{t("auth.consentDescription")}</Text>

          <Card style={styles.termsCard}>
            <Text style={styles.termsHeading}>
              {t ? t("auth.consentHeading", "Key Platform Principles:") : "Key Platform Principles:"}
            </Text>
            <Text style={styles.termsItem}>
              {t ? t("auth.consentPoint1", "• Zero commission taken from technician wages or day rates.") : "• Zero commission taken from technician wages or day rates."}
            </Text>
            <Text style={styles.termsItem}>
              {t ? t("auth.consentPoint2", "• Direct negotiation and booking between crew and recruiters.") : "• Direct negotiation and booking between crew and recruiters."}
            </Text>
            <Text style={styles.termsItem}>
              {t ? t("auth.consentPoint3", "• Privacy protection: exact GPS location is never tracked or shared.") : "• Privacy protection: exact GPS location is never tracked or shared."}
            </Text>
            <Text style={styles.termsItem}>
              {t ? t("auth.consentPoint4", "• Professional conduct and verified trade credentials respected.") : "• Professional conduct and verified trade credentials respected."}
            </Text>
            <Text style={styles.versionTag}>
              {language === "ml" ? `പതിപ്പ് ${CURRENT_CONSENT_VERSION} (DPDP അനുസൃതമായത്)` : `Version ${CURRENT_CONSENT_VERSION} (DPDP Compliant)`}
            </Text>
          </Card>

          {/* Consent Checkbox */}
          <TouchableOpacity
            onPress={() => setAgreed(!agreed)}
            style={styles.checkboxRow}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <CheckIcon size={12} color="#0D0D0D" />}
            </View>
            <Text style={styles.checkboxLabel}>{t("auth.agreeToTerms")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Button
            title={t("auth.agreeAndContinue")}
            variant="primary"
            size="lg"
            disabled={!agreed}
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
    padding: 24,
    justifyContent: "space-between",
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text.white,
    marginBottom: 8,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  termsCard: {
    padding: 16,
    gap: 8,
    marginBottom: 20,
  },
  termsHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.brand.primary,
    marginBottom: 4,
  },
  termsItem: {
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 18,
  },
  versionTag: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.text.muted,
    marginTop: 8,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.border.base,
    backgroundColor: Colors.bg.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  checkmark: {
    color: Colors.text.inverse,
    fontWeight: "bold",
    fontSize: 14,
  },
  checkboxLabel: {
    fontSize: 13,
    color: Colors.text.primary,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    marginTop: 32,
  },
});

export default ConsentScreen;

