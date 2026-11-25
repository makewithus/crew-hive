/**
 * apps/mobile/src/screens/shared/AppTourScreen.js
 * Optional, skippable 3-slide app tour explaining platform principles.
 * Never forced; completion state persisted in SecureStore.
 */

import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Button from "../../components/common/Button.js";
import {
  ConsoleFaderIcon,
  BellIcon,
  ShieldCheckIcon,
} from "../../components/common/AvIcons.js";

const TOUR_COMPLETED_KEY = "crewhive_tour_completed";

export async function isTourCompleted() {
  try {
    const val = await SecureStore.getItemAsync(TOUR_COMPLETED_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export async function markTourCompleted() {
  try {
    await SecureStore.setItemAsync(TOUR_COMPLETED_KEY, "true");
  } catch {}
}

const SLIDES = [
  {
    id: 1,
    icon: (color) => <ConsoleFaderIcon size={48} color={color} />,
    titleEn: "0% Commission Direct Bookings",
    titleMl: "നേരിട്ടുള്ള ബുക്കിംഗ് • 0% കമ്മീഷൻ",
    descEn: "CrewHive is built for Kerala's audio-visual and event industry. No commission is deducted from technician wages. Recruiters negotiate and book talent directly.",
    descMl: "കേരളത്തിലെ AV, ഇവന്റ് മേഖലയ്ക്കായി പ്രത്യേകം രൂപകൽപ്പന ചെയ്ത പ്ലാറ്റ്‌ഫോം. ടെക്നീഷ്യൻമാരുടെ വേതനത്തിൽ നിന്ന് കമ്മീഷൻ ഈടാക്കില്ല. നേരിട്ടുള്ള ആശയവിനിമയം.",
  },
  {
    id: 2,
    icon: (color) => <BellIcon size={48} color={color} />,
    titleEn: "7-Day Active Availability",
    titleMl: "സജീവ ലഭ്യതയും അടിയന്തര കോളുകളും",
    descEn: "Switch availability ON when you have open dates. Broadcast stays active for 7 days or until you turn it off. Receive push alerts for urgent local gigs.",
    descMl: "ഷൂട്ടുകൾക്കോ ഇവന്റുകൾക്കോ തീയതികൾ ഒഴിവുള്ളപ്പോൾ ലഭ്യത ഓണാക്കുക. 7 ദിവസത്തേക്ക് പ്രൊഫൈൽ സെർച്ചുകളിൽ മുൻനിരയിൽ കാണിക്കും. അടിയന്തര കോളുകൾ ലഭിക്കും.",
  },
  {
    id: 3,
    icon: (color) => <ShieldCheckIcon size={48} color={color} />,
    titleEn: "Privacy by Design (DPDP 2023)",
    titleMl: "പൂർണ്ണ സ്വകാര്യതാ സംരക്ഷണം",
    descEn: "Exact GPS coordinates are never stored or exposed. Only coarse district-level location is used while available. You can withdraw location consent anytime from Settings.",
    descMl: "കൃത്യമായ ജി.പി.എസ് ലൊക്കേഷൻ ശേഖരിക്കുകയോ പങ്കിടുകയോ ഇല്ല. ഏകദേശ ജില്ലാ വിവരങ്ങൾ മാത്രം. സെറ്റിംഗ്സിൽ നിന്ന് എപ്പോൾ വേണമെങ്കിലും അനുമതി പിൻവലിക്കാം.",
  },
];

export function AppTourScreen({ navigation, language = "en", onToggleLanguage, t }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const isMl = language === "ml";

  const handleFinish = async () => {
    await markTourCompleted();
    navigation.goBack();
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const slide = SLIDES[currentSlide];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={isMl ? "ആപ്പ് ടൂർ" : "CrewHive Tour"}
        subtitle={`${currentSlide + 1} / ${SLIDES.length}`}
        showBack={true}
        onBack={handleFinish}
        language={language}
        onToggleLanguage={onToggleLanguage}
        rightAction={
          <TouchableOpacity onPress={handleFinish} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.skipText}>{isMl ? "ഒഴിവാക്കുക" : "Skip"}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.slideCard}>
          <View style={styles.iconContainer}>
            {slide.icon(Colors.accent.amber)}
          </View>

          <Text style={styles.title}>
            {isMl ? slide.titleMl : slide.titleEn}
          </Text>

          <Text style={styles.desc}>
            {isMl ? slide.descMl : slide.descEn}
          </Text>
        </Card>

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === currentSlide && styles.activeDot,
              ]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            title={
              currentSlide === SLIDES.length - 1
                ? (isMl ? "തുടങ്ങാം" : "Get Started")
                : (isMl ? "അടുത്തത്" : "Next")
            }
            variant="primary"
            size="lg"
            onPress={handleNext}
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
    flexGrow: 1,
    padding: Dimensions.screenPadding,
    justifyContent: "space-between",
  },
  skipText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semiBold,
    color: Colors.accent.amber,
  },
  slideCard: {
    padding: 28,
    alignItems: "center",
    marginTop: 24,
    backgroundColor: Colors.bg.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border.base,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(245, 166, 35, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: "rgba(245, 166, 35, 0.3)",
  },
  title: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: 16,
  },
  desc: {
    fontSize: Typography.size.sm,
    lineHeight: 22,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginVertical: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border.base,
  },
  activeDot: {
    width: 24,
    backgroundColor: Colors.accent.amber,
  },
  actions: {
    marginBottom: 16,
  },
});

export default AppTourScreen;

