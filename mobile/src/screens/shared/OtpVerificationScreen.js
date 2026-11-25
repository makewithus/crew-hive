/**
 * apps/mobile/src/screens/shared/OtpVerificationScreen.js
 * 6-digit OTP verification screen with 30s resend cooldown countdown and rate-limit handling.
 */

import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Colors, Radius, Typography } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Input from "../../components/common/Input.js";
import Button from "../../components/common/Button.js";
import { toast } from "../../components/common/Toast.js";
import { authService } from "../../services/authService.js";
import { smsRetrieverService } from "../../services/smsRetrieverService.js";

export function OtpVerificationScreen({ navigation, route, language, onToggleLanguage, t, onAuthSuccess }) {
  const phone = route?.params?.phone || "";
  const targetRole = route?.params?.role || "crew";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(30);
  const isVerifyingRef = useRef(false);

  // 30s countdown timer
  useEffect(() => {
    let timer = null;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Android SMS Auto-Read listener
  useEffect(() => {
    const unsubscribe = smsRetrieverService.startListening(
      (autoDetectedCode) => {
        if (!isVerifyingRef.current && autoDetectedCode && autoDetectedCode.length === 6) {
          setOtp(autoDetectedCode);
          handleVerify(autoDetectedCode);
        }
      },
      () => {
        // Gracefully ignore auto-read errors/timeouts and allow standard manual entry
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleVerify = async (codeOverride) => {
    if (isVerifyingRef.current) return;
    const code = (codeOverride !== undefined ? codeOverride : otp).trim();
    if (code.length !== 6) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    isVerifyingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const result = await authService.verifyOtp(phone, code, targetRole);

      if (result.isNewUser) {
        // New user must review versioned consent, then enter role-specific onboarding
        navigation.navigate("Consent", {
          phone,
          role: targetRole,
        });
      } else {
        // Returning user - check if they need role onboarding or can go to dashboard
        const isRecruiterTarget = targetRole === "recruiter";
        const hasRecruiterProfile = result.user?.role === "recruiter";
        const hasCrewProfile = result.user?.role === "crew";

        if (isRecruiterTarget) {
          if (hasRecruiterProfile) {
            if (onAuthSuccess) onAuthSuccess({ ...result.user, role: "recruiter" });
            navigation.reset({ routes: [{ name: "RecruiterDashboard" }] });
          } else {
            // Existing account adding a recruiter profile
            navigation.navigate("RecruiterOnboarding", { phone, role: "recruiter" });
          }
        } else {
          if (hasCrewProfile) {
            if (onAuthSuccess) onAuthSuccess({ ...result.user, role: "crew" });
            navigation.reset({ routes: [{ name: "CrewDashboard" }] });
          } else {
            // Incomplete crew profile - resume craft selection
            navigation.navigate("RoleSelection", { phone, role: "crew" });
          }
        }
      }
    } catch (err) {
      let msg = err.response?.data?.error?.message;
      if (!msg) {
        if (err.message === "Network Error" || err.code === "ECONNABORTED" || err.code === "ERR_NETWORK") {
          msg = "Network connection error. Please ensure the CrewHive API server is running.";
        } else {
          msg = err.message || "Invalid verification code";
        }
      }
      setError(msg);
      toast.error(msg, language === "ml" ? "പരിശോധന പരാജയപ്പെട്ടു" : "Verification Failed");
    } finally {
      setLoading(false);
      isVerifyingRef.current = false;
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError("");
    try {
      await authService.sendOtp(phone);
      setCountdown(30);
      toast.success(
        language === "ml"
          ? `${phone}-ലേക്ക് പുതിയ 6 അക്ക കോഡ് അയച്ചിട്ടുണ്ട്`
          : `A new 6-digit code has been dispatched to ${phone}`,
        language === "ml" ? "കോഡ് അയച്ചു" : "Code Sent"
      );
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || "Could not resend code";
      setError(msg);
      toast.error(msg, language === "ml" ? "വീണ്ടും അയക്കൽ പരാജയപ്പെട്ടു" : "Resend Failed");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t ? t("auth.verifyOtp", "Verify Code") : "Verify Code"}
        subtitle={language === "ml" ? "ഘട്ടം 1 / 4" : "Step 1 of 4"}
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
            <Text style={styles.title}>{t("auth.verifyOtp")}</Text>
            <Text style={styles.subtitle}>
              {t("auth.otpSentTo")}{" "}
              <Text style={styles.phoneHighlight}>{phone}</Text>
            </Text>

            <Input
              value={otp}
              onChangeText={(val) => {
                const cleaned = val.replace(/\D/g, "").slice(0, 6);
                setOtp(cleaned);
                if (error) setError("");
                if (cleaned.length === 6) {
                  handleVerify(cleaned);
                }
              }}
              placeholder={language === "ml" ? "OTP നൽകുക" : "Enter OTP"}
              keyboardType="number-pad"
              maxLength={6}
              error={error}
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
              importantForAutofill="yes"
              inputStyle={styles.otpInput}
            />

            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>
                  {t("auth.resendIn")} {countdown}s
                </Text>
              ) : (
                <Button
                  title={t("auth.resendNow")}
                  variant="ghost"
                  size="sm"
                  onPress={handleResend}
                />
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              title={t("auth.verifyOtp")}
              variant="primary"
              size="lg"
              loading={loading}
              onPress={() => handleVerify()}
            />
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
  phoneHighlight: {
    fontWeight: "700",
    color: Colors.brand.primary,
  },
  otpInput: {
    letterSpacing: 10,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  resendRow: {
    alignItems: "center",
    marginTop: 12,
  },
  countdownText: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  footer: {
    marginTop: 32,
  },
});

export default OtpVerificationScreen;

