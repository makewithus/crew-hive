/**
 * apps/mobile/src/screens/recruiter/CrewDetailScreen.js
 * Recruiter view of technician profile with direct availability dispatch and shortlisting.
 */

import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, Share, Modal, TouchableOpacity, TextInput, Image } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import Button from "../../components/common/Button.js";
import { toast } from "../../components/common/Toast.js";
import { confirmModal } from "../../components/common/ThemedModal.js";
import { getCraftIcon, MapPinIcon, ShieldCheckIcon } from "../../components/common/AvIcons.js";
import { recruiterService } from "../../services/recruiterService.js";
import { findRoleOrSpecialisation, LAUNCH_CITIES, KERALA_DISTRICTS } from "@crew-hive/shared";

export function CrewDetailScreen({ navigation, route, language, onToggleLanguage, t }) {
  const crew = route?.params?.crew || {};
  const [saving, setSaving] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("inappropriate_content");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const isMl = language === "ml";

  const craftLookup = crew.primaryRole ? findRoleOrSpecialisation(crew.primaryRole, language) : null;
  const craftDisplay = (craftLookup?.label || (crew.primaryRole || "Technician")).replace(/_/g, " ").toUpperCase();

  const rawCity = typeof crew.city === "object" ? (crew.city.nameEn || crew.city.name || "Kochi") : (crew.city || "Kochi");
  const cityMatch =
    LAUNCH_CITIES.find((c) => (c.nameEn || c.name || "").toLowerCase() === String(rawCity).toLowerCase()) ||
    KERALA_DISTRICTS.find((d) => (d.nameEn || d.name || "").toLowerCase() === String(rawCity).toLowerCase());
  const cityDisplay = isMl ? (cityMatch?.nameMl || rawCity) : (cityMatch?.nameEn || rawCity);
  const stateDisplay = isMl ? "കേരളം" : "Kerala";

  const dayRateDisplay =
    crew.showDayRate && crew.dayRate
      ? `₹${Number(crew.dayRate).toLocaleString("en-IN")} ${t ? t("common.day", "/ day") : "/ day"}`
      : (t ? t("common.rateOnRequest", "Rate on request") : "Rate on request");

  const isAvail = Boolean(crew.availableNow);

  const handleShareProfile = async () => {
    try {
      const profileUrl = `${process.env.EXPO_PUBLIC_WEB_URL || "https://crewhive.in"}/crew/${crew.id}`;
      const message = isMl
        ? `ക്രൂഹൈവിൽ ${crew.name || "ടെക്നീഷ്യൻ"} (${craftDisplay}) ന്റെ പ്രൊഫൈൽ കാണുക: ${profileUrl}`
        : `Check out ${crew.name || "Technician"} (${craftDisplay}) on CrewHive: ${profileUrl}`;
      await Share.share({
        message,
        url: profileUrl,
        title: `${crew.name || "Technician"} - CrewHive`,
      });
    } catch (_) {}
  };

  const handleBlockProfile = () => {
    confirmModal({
      title: isMl ? "ടെക്നീഷ്യനെ ബ്ലോക്ക് ചെയ്യണോ?" : "Block Technician?",
      message: isMl
        ? "ഈ പ്രൊഫൈൽ ബ്ലോക്ക് ചെയ്താൽ പിന്നീട് നിങ്ങളുടെ തിരയലുകളിൽ കാണിക്കില്ല, കൂടാതെ അവർക്ക് നിങ്ങളുടെ അന്വേഷണങ്ങൾ അയക്കാൻ കഴിയില്ല."
        : "Blocking this profile will remove them from your searches and prevent them from receiving requests from you.",
      confirmText: isMl ? "ബ്ലോക്ക് ചെയ്യുക" : "Block Profile",
      cancelText: isMl ? "റദ്ദാക്കുക" : "Cancel",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await recruiterService.blockProfile(crew.id);
          toast.success(
            isMl
              ? "ഈ പ്രൊഫൈലിനെ വിജയകരമായി ബ്ലോക്ക് ചെയ്തിരിക്കുന്നു."
              : "Technician has been blocked and will no longer appear in your searches.",
            isMl ? "ബ്ലോക്ക് ചെയ്തു" : "Profile Blocked"
          );
          navigation.goBack();
        } catch (err) {
          toast.error(err.message || "Failed to block profile", isMl ? "പിശക്" : "Error");
        }
      },
    });
  };

  const handleSubmitReport = async () => {
    setSubmittingReport(true);
    try {
      await recruiterService.reportProfile(crew.id, reportReason, reportDetails);
      setReportModalVisible(false);
      setReportDetails("");
      toast.success(
        isMl
          ? "നിങ്ങളുടെ റിപ്പോർട്ടിന് നന്ദി. ഞങ്ങളുടെ മോഡറേഷൻ ടീം ഇത് ഉടൻ പരിശോധിക്കും."
          : "Thank you for letting us know. Our moderation team will review this profile.",
        isMl ? "റിപ്പോർട്ട് സമർപ്പിച്ചു" : "Report Submitted"
      );
    } catch (err) {
      toast.error(err.apiMessage || err.message || "Failed to submit report", isMl ? "പിശക്" : "Error");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleSaveToShortlist = async () => {
    setSaving(true);
    try {
      await recruiterService.addToShortlist(crew.id);
      toast.success(
        `${crew.name || "Technician"} ${t ? t("recruiter.addedToShortlist", "has been added to your shortlist.") : "has been added to your shortlist."}`,
        t ? t("recruiter.saved", "Saved to Shortlist") : "Saved to Shortlist"
      );
    } catch (err) {
      toast.error(
        err.apiMessage || err.message || (isMl ? "ദയവായി വീണ്ടും ശ്രമിക്കുക." : "Please try again."),
        isMl ? "സേവ് ചെയ്യാൻ കഴിഞ്ഞില്ല" : "Could not save"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDispatchInquiry = () => {
    navigation.navigate("CreateRequest", {
      preselectedCrew: crew,
      preselectedRole: crew.primaryRole,
      preselectedCity: crew.city,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t ? t("crew.publicProfile", "Technician Profile") : "Technician Profile"}
        subtitle={t ? t("crew.keralaAvDirectory", "Kerala AV Directory") : "Kerala AV Directory"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero Card */}
        <Card style={styles.heroCard}>
          <View style={styles.craftBadgeCircle}>
            {crew.profileImage ? (
              <Image source={{ uri: crew.profileImage }} style={styles.avatarImg} />
            ) : (
              getCraftIcon(crew.primaryRole || "sound_engineer", {
                size: 36,
                color: Colors.accent.amber,
              })
            )}
          </View>
          <Text style={styles.name}>{crew.name}</Text>
          <Text style={styles.primaryCraft} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.85}>
            {craftDisplay}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MapPinIcon size={14} color={Colors.text.muted} />
              <Text style={styles.metaText}>{cityDisplay}, {stateDisplay}</Text>
            </View>
            <Badge
              label={isAvail ? (t ? t("crew.availableNow", "AVAILABLE NOW") : "AVAILABLE NOW") : (t ? t("crew.standby", "STANDBY") : "STANDBY")}
              variant={isAvail ? "green" : "neutral"}
              size="sm"
            />
          </View>

          {crew.associationCode && (
            <View style={styles.assocWrap}>
              <ShieldCheckIcon size={14} color={Colors.roles.association} />
              <Text style={styles.assocText}>
                {t ? t("crew.verifiedMember", "Verified Member: ") : "Verified Member: "}
                {crew.associationCode}
              </Text>
            </View>
          )}
        </Card>

        {/* Commercials Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeading}>
            {t ? t("recruiter.ratesAndLogistics", "Rates & Logistical Scope") : "Rates & Logistical Scope"}
          </Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              {t ? t("recruiter.indicativeDayRate", "Indicative Day Rate") : "Indicative Day Rate"}
            </Text>
            <Text style={styles.rowValue}>{dayRateDisplay}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              {t ? t("crew.experienceLevel", "Experience Level") : "Experience Level"}
            </Text>
            <Text style={styles.rowValue}>
              {crew.experience ? (isMl && (crew.experience === "Experienced" || crew.experience === "Professional (3+ yrs)") ? (t ? t("crew.experienced", "Experienced") : "Experienced") : crew.experience) : (t ? t("crew.experienced", "Experienced") : "Experienced")}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>
              {t ? t("crew.travelRadius", "Travel Radius") : "Travel Radius"}
            </Text>
            <Text style={styles.rowValue}>
              {crew.travelRadius ? (isMl && (crew.travelRadius === "All Kerala" || crew.travelRadius === "All Kerala Districts") ? (t ? t("crew.allKeralaDistricts", "All Kerala Districts") : "All Kerala Districts") : crew.travelRadius) : (t ? t("crew.allKeralaDistricts", "All Kerala Districts") : "All Kerala Districts")}
            </Text>
          </View>
        </Card>

        {/* Bio & Background */}
        <Card style={styles.card}>
          <Text style={styles.sectionHeading}>
            {t ? t("recruiter.aboutCraft", "About Craft") : "About Craft"}
          </Text>
          <Text style={styles.bioText}>
            {crew.bio ||
              (t ? t("crew.defaultBio", "Experienced audio-visual technician operating across Kerala live concerts, corporate audio setups, and broadcast events.") : "Experienced audio-visual technician operating across Kerala live concerts, corporate audio setups, and broadcast events.")}
          </Text>
        </Card>

        {/* Languages Known (B3) */}
        {Array.isArray(crew.languages) && crew.languages.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionHeading}>
              {isMl ? "സംസാരിക്കുന്ന ഭാഷകൾ" : "Languages Known"}
            </Text>
            <View style={styles.tagsContainer}>
              {crew.languages.map((lang, idx) => (
                <Badge
                  key={idx}
                  label={lang}
                  variant="amber"
                  size="sm"
                />
              ))}
            </View>
          </Card>
        )}

        {/* Past Credits & Shows (B6) */}
        {Array.isArray(crew.pastCredits) && crew.pastCredits.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionHeading}>
              {isMl ? "കഴിഞ്ഞ വർക്കുകൾ & പ്രൊഡക്ഷനുകൾ" : "Past Credits & Productions"}
            </Text>
            {crew.pastCredits.map((c, idx) => (
              <View key={idx} style={styles.creditRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creditName}>{c.eventName}</Text>
                  <Text style={styles.creditSub}>{c.role || "Crew"} • {c.year || ""}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Equipment Owned (B7) */}
        {Array.isArray(crew.equipmentOwned) && crew.equipmentOwned.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.sectionHeading}>
              {isMl ? "സ്വന്തം ഉപകരണങ്ങൾ (Gear)" : "Equipment Owned"}
            </Text>
            {crew.equipmentOwned.map((eq, idx) => (
              <View key={idx} style={styles.creditRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creditName}>{eq.name}</Text>
                  <Text style={styles.creditSub}>{eq.category || "Gear"}{eq.model ? ` • ${eq.model}` : ""}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actionButtons}>
          <Button
            title={t ? t("recruiter.dispatchInquiryBtn", "Dispatch Availability Inquiry") : "Dispatch Availability Inquiry"}
            variant="primary"
            size="lg"
            onPress={handleDispatchInquiry}
            style={{ marginBottom: 10 }}
          />

          <Button
            title={saving ? (t ? t("recruiter.saving", "Saving...") : "Saving...") : (t ? t("recruiter.saveToShortlist", "Save to Shortlist") : "Save to Shortlist")}
            variant="outline"
            size="md"
            onPress={handleSaveToShortlist}
            style={{ marginBottom: 10 }}
          />

          <Button
            title={isMl ? "പ്രൊഫൈൽ ഷെയർ ചെയ്യുക (Share)" : "Share Profile"}
            variant="secondary"
            size="md"
            onPress={handleShareProfile}
          />

          <View style={styles.safetyRow}>
            <TouchableOpacity onPress={() => setReportModalVisible(true)} style={styles.safetyBtn}>
              <Text style={styles.safetyBtnText}>{isMl ? "പ്രൊഫൈൽ റിപ്പോർട്ട് ചെയ്യുക" : "Report Profile"}</Text>
            </TouchableOpacity>
            <Text style={styles.safetyDivider}>•</Text>
            <TouchableOpacity onPress={handleBlockProfile} style={styles.safetyBtn}>
              <Text style={[styles.safetyBtnText, { color: Colors.semantic.error }]}>
                {isMl ? "ടെക്നീഷ്യനെ ബ്ലോക്ക് ചെയ്യുക" : "Block Technician"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Report Profile Modal */}
        <Modal
          visible={reportModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setReportModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{isMl ? "പ്രൊഫൈൽ റിപ്പോർട്ട് ചെയ്യുക" : "Report Profile"}</Text>
              <Text style={styles.modalSubtitle}>
                {isMl
                  ? "ഈ പ്രൊഫൈലിൽ എന്തെങ്കിലും പ്രശ്നമുണ്ടെങ്കിൽ ദയവായി കാരണം വ്യക്തമാക്കുക:"
                  : "Please select a reason why this profile is being reported:"}
              </Text>

              {[
                { key: "inappropriate_content", label: isMl ? "അനുചിതമായ ഉള്ളടക്കം" : "Inappropriate / Offensive Content" },
                { key: "fake_profile", label: isMl ? "വ്യാജ പ്രൊഫൈൽ / ആൾമാറാട്ടം" : "Fake Profile or Impersonation" },
                { key: "unprofessional", label: isMl ? "പെരുമാറ്റ പ്രശ്നം / ഹാജരാകാതിരിക്കൽ" : "No-Show or Unprofessional Conduct" },
                { key: "incorrect_skills", label: isMl ? "തെറ്റായ വിവരങ്ങൾ / യോഗ്യതകൾ" : "Incorrect Skills or False Credentials" },
                { key: "other", label: isMl ? "മറ്റു കാരണങ്ങൾ" : "Other Policy Violation" },
              ].map((reason) => (
                <TouchableOpacity
                  key={reason.key}
                  onPress={() => setReportReason(reason.key)}
                  style={[
                    styles.reasonOption,
                    reportReason === reason.key && styles.selectedReasonOption,
                  ]}
                >
                  <Text
                    style={[
                      styles.reasonOptionText,
                      reportReason === reason.key && styles.selectedReasonOptionText,
                    ]}
                  >
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <TextInput
                placeholder={isMl ? "കൂടുതൽ വിവരങ്ങൾ (ഐച്ഛികം)..." : "Additional details (optional)..."}
                placeholderTextColor={Colors.text.muted}
                value={reportDetails}
                onChangeText={setReportDetails}
                multiline={true}
                numberOfLines={3}
                style={styles.reportInput}
              />

              <View style={styles.modalActions}>
                <Button
                  title={isMl ? "റദ്ദാക്കുക" : "Cancel"}
                  variant="ghost"
                  size="sm"
                  onPress={() => setReportModalVisible(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={submittingReport ? (isMl ? "അയക്കുന്നു..." : "Submitting...") : (isMl ? "സമർപ്പിക്കുക" : "Submit Report")}
                  variant="danger"
                  size="sm"
                  loading={submittingReport}
                  onPress={handleSubmitReport}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>
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
  heroCard: {
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  craftBadgeCircle: {
    width: 76,
    height: 76,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.raised,
    borderWidth: 2,
    borderColor: Colors.accent.amber,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  creditRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  creditName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.primary,
  },
  creditSub: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: 2,
  },
  name: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  primaryCraft: {
    fontSize: Typography.size.sm,
    color: Colors.accent.amber,
    fontWeight: Typography.weight.semiBold,
    marginTop: 4,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  assocWrap: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.3)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  assocText: {
    fontSize: Typography.size.xs,
    color: Colors.accent.amber,
    fontWeight: Typography.weight.semiBold,
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  rowLabel: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
  },
  rowValue: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
  },
  bioText: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  actionButtons: {
    marginTop: 12,
  },
  safetyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 8,
    gap: 12,
  },
  safetyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  safetyBtnText: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    fontWeight: Typography.weight.medium,
    textDecorationLine: "underline",
  },
  safetyDivider: {
    color: Colors.text.muted,
    fontSize: Typography.size.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: Colors.surface.card,
    borderRadius: Radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  modalTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    marginBottom: 16,
  },
  reasonOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    backgroundColor: Colors.surface.raised,
    marginBottom: 8,
  },
  selectedReasonOption: {
    borderColor: Colors.accent.amber,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
  },
  reasonOptionText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  selectedReasonOptionText: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.semiBold,
  },
  reportInput: {
    backgroundColor: Colors.surface.raised,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    color: Colors.text.primary,
    fontSize: Typography.size.xs,
    padding: 10,
    textAlignVertical: "top",
    marginTop: 8,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default CrewDetailScreen;

