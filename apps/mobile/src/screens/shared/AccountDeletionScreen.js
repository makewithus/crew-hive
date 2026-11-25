/**
 * apps/mobile/src/screens/shared/AccountDeletionScreen.js
 * DPDP Act 2023 compliant permanent account and personal data erasure workflow.
 */

import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Input from "../../components/common/Input.js";
import Button from "../../components/common/Button.js";
import { AlertTriangleIcon } from "../../components/common/AvIcons.js";
import { toast } from "../../components/common/Toast.js";
import { confirmModal } from "../../components/common/ThemedModal.js";
import { authService } from "../../services/authService.js";

export function AccountDeletionScreen({ navigation, language, onToggleLanguage, onLogout, t }) {
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isMl = language === "ml";
  const isConfirmed = confirmation.trim().toUpperCase() === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmed) {
      setError(isMl ? 'സ്ഥിരീകരിക്കാൻ "DELETE" എന്ന് ടൈപ്പ് ചെയ്യുക' : 'Please type "DELETE" exactly to confirm');
      return;
    }

    confirmModal({
      title: isMl ? "അന്തിമ സ്ഥിരീകരണം" : "Final Confirmation",
      message: isMl
        ? "നിങ്ങൾക്ക് പൂർണ്ണ ബോധ്യമുണ്ടോ? ഈ പ്രവർത്തനം പഴയപടിയാക്കാൻ കഴിയില്ല. നിങ്ങളുടെ പ്രൊഫൈലും ഡാറ്റയും എന്നെന്നേക്കുമായി നീക്കം ചെയ്യപ്പെടും."
        : "Are you absolutely certain? This action cannot be undone and will permanently remove your profile, availability, and search presence.",
      confirmText: isMl ? "പൂർണ്ണമായി ഡിലീറ്റ് ചെയ്യുക" : "Permanently Delete",
      cancelText: t ? t("common.cancel", "Cancel") : "Cancel",
      variant: "destructive",
      onConfirm: async () => {
        setLoading(true);
        setError("");
        try {
          await authService.deleteAccount();
          toast.success(
            isMl
              ? "ഡാറ്റാ സംരക്ഷണ നിയമങ്ങൾക്കനുസൃതമായി നിങ്ങളുടെ വിവരങ്ങൾ പൂർണ്ണമായി ഡിലീറ്റ് ചെയ്തിരിക്കുന്നു."
              : "Your account and personal data have been completely deleted.",
            isMl ? "അക്കൗണ്ട് നീക്കം ചെയ്തു" : "Account Erased"
          );
          if (onLogout) {
            onLogout();
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: "Welcome" }],
            });
          }
        } catch (err) {
          const msg =
            err.response?.data?.error?.message ||
            err.message ||
            "Failed to erase account. Please contact support.";
          setError(msg);
          toast.error(msg, isMl ? "പിശക്" : "Deletion Failed");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t ? t("settings.deleteAccount", "Delete Account") : "Delete Account"}
        subtitle={isMl ? "DPDP നിയമം 2023 അനുസൃതമായത്" : "DPDP Act 2023 Compliance"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warningBanner}>
          <View style={styles.warningTitleRow}>
            <AlertTriangleIcon size={18} color={Colors.semantic.error} />
            <Text style={styles.warningTitle}>{isMl ? "തിരുത്താനാകാത്ത പ്രവർത്തനം" : "Irreversible Action"}</Text>
          </View>
          <Text style={styles.warningText}>
            {isMl
              ? "ഡിജിറ്റൽ വ്യക്തിഗത വിവര സംരക്ഷണ നിയമം (DPDP Act 2023) അനുസരിച്ച് നിങ്ങളുടെ സ്വകാര്യ വിവരങ്ങൾ പൂർണ്ണമായി നീക്കം ചെയ്യാൻ നിങ്ങൾക്ക് അവകാശമുണ്ട്."
              : "Under India's Digital Personal Data Protection Act 2023, you have the right to complete erasure of your personal data."}
          </Text>
        </View>

        <Card style={styles.dataCard}>
          <Text style={styles.dataHeading}>{isMl ? "എന്നെന്നേക്കുമായി നീക്കം ചെയ്യപ്പെടുന്നവ:" : "What will be permanently deleted:"}</Text>
          <Text style={styles.dataItem}>{isMl ? "• നിങ്ങളുടെ ഫോൺ നമ്പറും ലോഗിൻ വിവരങ്ങളും" : "• Your phone number and authentication credentials"}</Text>
          <Text style={styles.dataItem}>{isMl ? "• നിങ്ങളുടെ പബ്ലിക് ക്രൂ അല്ലെങ്കിൽ റിക്രൂട്ടർ പ്രൊഫൈൽ" : "• Your public crew or recruiter profile and craft listings"}</Text>
          <Text style={styles.dataItem}>{isMl ? "• നിങ്ങളുടെ ലഭ്യത സ്റ്റാറ്റസും ലൊക്കേഷൻ വിവരങ്ങളും" : "• Your active 7-day availability status and location coordinates"}</Text>
          <Text style={styles.dataItem}>{isMl ? "• മുൻകാല വർക്ക് അന്വേഷണ ലോഗുകൾ" : "• Your availability request logs and contact disclosures"}</Text>
          <Text style={styles.dataItem}>{isMl ? "• നോട്ടിഫിക്കേഷൻ ടോക്കണുകൾ" : "• All device push tokens and notifications"}</Text>
        </Card>

        {/* Web Deletion Portal Link (Google Play Data Safety Mandate) */}
        <View style={styles.webLinkBox}>
          <Text style={styles.webLinkText}>
            {isMl
              ? "വെബ് പോർട്ടൽ വഴി അക്കൗണ്ട് നീക്കം ചെയ്യാനോ വെബ്സൈറ്റിൽ അഭ്യർത്ഥിക്കാനോ:"
              : "Prefer to delete via our official web portal or without this app?"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              const url = (process.env.EXPO_PUBLIC_WEB_URL || "https://crewhive.in") + "/delete-account";
              Linking.openURL(url).catch(() => {
                toast.error(`Please visit ${url} in your browser.`, "Link Error");
              });
            }}
            style={styles.webLinkBtn}
          >
            <Text style={styles.webLinkBtnText}>
              {isMl ? "വെബ് അക്കൗണ്ട് ഡിലീഷൻ പേജ് സന്ദർശിക്കുക ↗" : "Visit Web Account Deletion Page ↗"}
            </Text>
          </TouchableOpacity>
        </View>

        <Input
          label={isMl ? "കാരണം വ്യക്തമാക്കുക (ഐച്ഛികം)" : "Optional: Tell us why you are leaving"}
          placeholder={isMl ? "ഉദാ: കേരളത്തിന് പുറത്തേക്ക് മാറി, തൊഴിൽ മേഖല മാറി..." : "e.g. Relocated outside Kerala, changed profession"}
          value={reason}
          onChangeText={setReason}
        />

        <View style={styles.confirmBox}>
          <Text style={styles.confirmInstruction}>
            {isMl ? "ഡിലീറ്റ് ചെയ്യുന്നത് സ്ഥിരീകരിക്കാൻ താഴെ " : "To confirm permanent erasure, please type "}
            <Text style={styles.boldWord}>DELETE</Text>
            {isMl ? " എന്ന് ടൈപ്പ് ചെയ്യുക:" : " below:"}
          </Text>
          <Input
            placeholder="DELETE"
            value={confirmation}
            onChangeText={(txt) => {
              setConfirmation(txt);
              if (error) setError("");
            }}
            error={error}
            autoCapitalize="characters"
          />
        </View>

        <Button
          title={loading ? (isMl ? "ഡിലീറ്റ് ചെയ്യുന്നു..." : "Erasing Data...") : (isMl ? "അക്കൗണ്ട് പൂർണ്ണമായി നീക്കം ചെയ്യുക" : "Permanently Erase My Account")}
          variant="danger"
          size="lg"
          disabled={!isConfirmed || loading}
          loading={loading}
          onPress={handleDelete}
          style={styles.deleteBtn}
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
  warningBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 20,
  },
  warningTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  warningTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.semantic.error,
  },
  warningText: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  dataCard: {
    padding: 16,
    marginBottom: 20,
  },
  dataHeading: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
    marginBottom: 10,
  },
  dataItem: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  confirmBox: {
    marginTop: 10,
    marginBottom: 24,
  },
  confirmInstruction: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    marginBottom: 10,
  },
  boldWord: {
    fontWeight: Typography.weight.bold,
    color: Colors.semantic.error,
  },
  deleteBtn: {
    marginTop: 8,
  },
  webLinkBox: {
    backgroundColor: Colors.surface.raised,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  webLinkText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  webLinkBtn: {
    paddingVertical: 4,
  },
  webLinkBtnText: {
    fontSize: Typography.size.sm,
    color: Colors.accent.amber,
    fontWeight: Typography.weight.semiBold,
  },
});

export default AccountDeletionScreen;

