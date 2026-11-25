/**
 * apps/mobile/src/screens/shared/PhoneAuthScreen.js
 * Mobile phone number entry with Indian format validation and 30s OTP dispatch.
 */

import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Colors, Radius, Typography } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Input from "../../components/common/Input.js";
import Button from "../../components/common/Button.js";
import { IndiaFlagIcon } from "../../components/common/AvIcons.js";
import { toast } from "../../components/common/Toast.js";
import { authService } from "../../services/authService.js";
import { isValidIndianPhone, normalizeIndianPhone } from "@crew-hive/shared";

export function PhoneAuthScreen({ navigation, route, language, onToggleLanguage, t }) {
  const targetRole = route?.params?.role || "crew";
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePhoneChange = (val) => {
    // Strictly extract digits only and cap at 10 digits
    const cleaned = val.replace(/\D/g, "").slice(0, 10);
    setPhone(cleaned);
    if (error) setError("");
  };

  const handleSendOtp = async () => {
    setError("");
    const cleaned = phone.replace(/\D/g, "").slice(0, 10);
    if (cleaned.length !== 10 || !/^[6-9]\d{9}$/.test(cleaned)) {
      setError(
        t
          ? t("auth.enterValidPhone", "Please enter a valid 10-digit Indian mobile number")
          : "Please enter a valid 10-digit Indian mobile number"
      );
      return;
    }

    const normalized = `+91${cleaned}`;
    setLoading(true);
    try {
      const res = await authService.sendOtp(normalized);
      navigation.navigate("OtpVerification", {
        phone: normalized,
        role: targetRole,
        devOtp: res?.devOtp || (cleaned === "9876543210" ? "123456" : null),
      });
    } catch (err) {
      let msg = err.response?.data?.error?.message;
      if (!msg) {
        if (err.message === "Network Error" || err.code === "ECONNABORTED" || err.code === "ERR_NETWORK") {
          msg = "Network connection error. Please ensure the CrewHive API server is running.";
        } else {
          msg = err.message || "Failed to send verification code";
        }
      }
      setError(msg);
      toast.error(msg, isMl ? "ലോഗിൻ പിശക്" : "Authentication Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t ? t("auth.authTitle", "Mobile Authentication") : "Mobile Authentication"}
        subtitle={targetRole === "recruiter" ? (t ? t("auth.recruiterEntry", "Recruiter Entry") : "Recruiter Entry") : (t ? t("auth.crewEntry", "Crew Entry") : "Crew Entry")}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <View>
            <Text style={styles.title}>{t("auth.enterPhone")}</Text>
            <Text style={styles.subtitle}>{t("auth.phoneHelper")}</Text>

            <View style={styles.phoneInputRow}>
              <View style={styles.countryCodeBox}>
                <IndiaFlagIcon width={22} height={15} />
                <Text style={styles.countryCode}>+91</Text>
              </View>

              <View style={styles.inputWrapper}>
                <Input
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder={language === "ml" ? "ഫോൺ നമ്പർ നൽകുക" : "Enter phone number"}
                  keyboardType="phone-pad"
                  maxLength={10}
                  error={error}
                />
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title={t("auth.sendOtp")}
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleSendOtp}
              style={styles.continueBtn}
            />
            <Text style={styles.privacyNote}>
              {t ? t("auth.smsDisclaimer", "By continuing, you agree to receive an SMS verification code. Standard carrier rates may apply.") : "By continuing, you agree to receive an SMS verification code. Standard carrier rates may apply."}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg.base,
  },
  keyboardView: {
    flex: 1,
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
    marginBottom: 24,
  },
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  countryCodeBox: {
    height: 48,
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1,
    borderColor: Colors.border.base,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  inputWrapper: {
    flex: 1,
  },
  footer: {
    marginTop: 32,
    gap: 16,
  },
  continueBtn: {
    width: "100%",
  },
  privacyNote: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: "center",
    lineHeight: 16,
  },
});

export default PhoneAuthScreen;

