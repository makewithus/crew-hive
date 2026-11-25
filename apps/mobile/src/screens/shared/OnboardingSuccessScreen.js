/**
 * apps/mobile/src/screens/shared/OnboardingSuccessScreen.js
 * Post-onboarding celebration screen directing user to their active workspace.
 */

import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Button from "../../components/common/Button.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import { ConsoleFaderIcon, BriefcaseIcon } from "../../components/common/AvIcons.js";

export function OnboardingSuccessScreen({ navigation, route, language, onToggleLanguage, t, onAuthSuccess }) {
  const role = route?.params?.role || "crew";
  const name = route?.params?.name || "Professional";
  const city = route?.params?.city || "Kochi";

  const isRecruiter = role === "recruiter";
  const isMl = language === "ml";

  const handleContinue = () => {
    if (onAuthSuccess) {
      onAuthSuccess({ role, name, city });
    }
    if (isRecruiter) {
      navigation.reset({ routes: [{ name: "RecruiterDashboard" }] });
    } else {
      navigation.reset({ routes: [{ name: "CrewDashboard" }] });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t ? t("common.appName", "CrewHive") : "CrewHive"}
        subtitle={isRecruiter ? (t ? t("recruiter.recruiterDesk", "Recruiter Desk") : "Recruiter Desk") : (t ? t("crew.workspaceTitle", "Crew Workspace") : "Crew Workspace")}
        showBack={false}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <View style={styles.content}>
        <View style={styles.badgeWrapper}>
          <View style={styles.iconCircle}>
            {isRecruiter ? (
              <BriefcaseIcon size={44} color={Colors.accent.amber} />
            ) : (
              <ConsoleFaderIcon size={44} color={Colors.accent.amber} />
            )}
          </View>
        </View>

        <Text style={styles.title}>
          {isRecruiter
            ? (isMl ? "റിക്രൂട്ടർ അക്കൗണ്ട് തയ്യാർ!" : "Recruiter Account Created!")
            : (isMl ? "ക്രൂ പ്രൊഫൈൽ ലൈവായി!" : "Crew Profile Active!")}
        </Text>
        <Text style={styles.subtitle}>
          {isRecruiter
            ? (isMl
                ? `സ്വാഗതം ${name}. നിങ്ങൾക്ക് ഇപ്പോൾ കേരളത്തിലെ സാങ്കേതിക വിദഗ്ദ്ധരെ കണ്ടെത്താനും നേരിട്ട് അന്വേഷണങ്ങൾ അയക്കാനും സാധിക്കും.`
                : `Welcome aboard, ${name}. You can now discover verified Kerala AV technicians and dispatch availability inquiries.`)
            : (isMl
                ? `സ്വാഗതം ${name}. നിങ്ങളുടെ പ്രൊഫൈൽ ഇപ്പോൾ ${city}-ൽ രജിസ്റ്റർ ചെയ്തിരിക്കുന്നു. ലഭ്യത ഓൺ ചെയ്ത് നേരിട്ടുള്ള വർക്കുകൾ സ്വീകരിക്കാം.`
                : `Welcome aboard, ${name}. Your profile is now indexed in ${city}. You can now toggle your availability and receive direct inquiries.`)}
        </Text>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{isMl ? "അക്കൗണ്ട് തരം" : "Account Type"}</Text>
            <Badge
              label={isRecruiter ? (isMl ? "ഇവന്റ് റിക്രൂട്ടർ" : "Event Recruiter") : (isMl ? "ഓഡിയോ-വിഷ്വൽ ക്രൂ" : "Audio-Visual Crew")}
              variant="amber"
              size="sm"
            />
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{isMl ? "പ്രവർത്തന നഗരം" : "Operating City"}</Text>
            <Text style={styles.summaryValue}>{city}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{isMl ? "പ്ലാറ്റ്‌ഫോം കമ്മീഷൻ" : "Platform Commission"}</Text>
            <Badge label={isMl ? "0% നേരിട്ടുള്ള ബുക്കിംഗ്" : "0% Direct Booking"} variant="green" size="sm" />
          </View>
        </Card>

        <View style={styles.btnContainer}>
          <Button
            title={
              isRecruiter
                ? (isMl ? "റിക്രൂട്ടർ ഡാഷ്‌ബോർഡിലേക്ക്" : "Open Recruiter Dashboard")
                : (isMl ? "ക്രൂ ഡാഷ്‌ബോർഡിലേക്ക്" : "Go to Crew Dashboard")
            }
            variant="primary"
            size="lg"
            onPress={handleContinue}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg.base,
  },
  content: {
    flex: 1,
    paddingHorizontal: Dimensions.screenPadding,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeWrapper: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.raised,
    borderWidth: 2,
    borderColor: Colors.accent.amber,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.accent.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  title: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  summaryCard: {
    width: "100%",
    marginBottom: 36,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  summaryLabel: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  summaryValue: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
  },
  btnContainer: {
    width: "100%",
  },
});

export default OnboardingSuccessScreen;

