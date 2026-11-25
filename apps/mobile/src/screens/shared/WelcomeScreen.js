/**
 * apps/mobile/src/screens/shared/WelcomeScreen.js
 * Welcome and entry screen with CrewHive branding, bilingual positioning, and dual entry points.
 */

import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, StatusBar, Linking } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Button from "../../components/common/Button.js";
import Header from "../../components/common/Header.js";
import { WhatsAppIcon } from "../../components/common/AvIcons.js";
import { toast } from "../../components/common/Toast.js";

export function WelcomeScreen({ navigation, language, onToggleLanguage, t }) {
  const handleWhatsAppSignUp = async () => {
    const rawNumber = process.env.EXPO_PUBLIC_WHATSAPP_NUMBER || "+918139002826";
    const digits = rawNumber.replace(/\D/g, "");
    const message = encodeURIComponent(
      language === "ml"
        ? "ഹലോ, ക്രൂഹൈവിൽ രജിസ്റ്റർ ചെയ്യാൻ താല്പര്യപ്പെടുന്നു"
        : "Hi, I want to sign up for CrewHive"
    );
    const url = `https://wa.me/${digits}?text=${message}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?phone=${digits}&text=${message}`);
      }
    } catch (err) {
      toast.info(
        "Could not open WhatsApp on this device. Please ensure WhatsApp is installed.",
        "WhatsApp"
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg.base} />
      <Header
        title={t ? t("common.appName", "CrewHive") : "CrewHive"}
        subtitle={t ? t("crew.networkSubtitle", "Kerala AV Network") : "Kerala AV Network"}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero Branding */}
        <View style={styles.heroSection}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandGlyph}>C</Text>
          </View>

          <Text style={styles.heroTitle}>{t("auth.welcomeTitle")}</Text>
          <Text style={styles.heroSubtitle}>{t("auth.welcomeSubtitle")}</Text>

          <View style={styles.priorityPill}>
            <Text style={styles.priorityText}>
              {language === "ml" ? "ലഭ്യമായ വിഭാഗങ്ങൾ: പ്രൊഫഷണൽ AV ക്രൂ" : "LAUNCH PRIORITY: SKILLED AV CREW"}
            </Text>
          </View>
        </View>

        {/* Action CTAs */}
        <View style={styles.ctaContainer}>
          <Button
            title={t("auth.createProfileCta")}
            variant="primary"
            size="lg"
            onPress={() => navigation.navigate("PhoneAuth", { role: "crew" })}
            style={styles.mainBtn}
          />

          <Button
            title={t("auth.hiringCrewCta")}
            variant="secondary"
            size="lg"
            onPress={() => navigation.navigate("PhoneAuth", { role: "recruiter" })}
            style={styles.mainBtn}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{language === "ml" ? "അല്ലെങ്കിൽ" : "OR"}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title={t("auth.signUpViaWhatsApp", "Sign up via WhatsApp")}
            variant="whatsapp"
            size="default"
            icon={<WhatsAppIcon size={18} />}
            onPress={handleWhatsAppSignUp}
          />
        </View>

        {/* Legal Disclaimer */}
        <Text style={styles.legalNotice}>
          {t("auth.legalNotice", "Direct booking network with zero commission deductions on technician wages.")}
        </Text>
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
    paddingBottom: 24,
    justifyContent: "space-between",
    minHeight: "90%",
  },
  heroSection: {
    alignItems: "center",
    marginTop: 20,
  },
  brandBadge: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  brandGlyph: {
    fontSize: 32,
    fontWeight: "900",
    color: Colors.text.inverse,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text.white,
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  priorityPill: {
    backgroundColor: Colors.brand.primaryLight,
    borderWidth: 1,
    borderColor: Colors.brand.primaryBorder,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.brand.primary,
    letterSpacing: 0.5,
  },
  ctaContainer: {
    marginTop: 32,
    gap: 12,
  },
  mainBtn: {
    width: "100%",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.base,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.text.muted,
  },
  legalNotice: {
    fontSize: 11,
    color: Colors.text.muted,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 16,
  },
});

export default WelcomeScreen;

