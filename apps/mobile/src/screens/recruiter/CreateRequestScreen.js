/**
 * apps/mobile/src/screens/recruiter/CreateRequestScreen.js
 * Multi-candidate availability request dispatch with 10-ping cap enforcement.
 */

import React, { useState } from "react";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Input from "../../components/common/Input.js";
import Button from "../../components/common/Button.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import DatePickerModal from "../../components/common/DatePickerModal.js";
import { toast } from "../../components/common/Toast.js";
import { PARENT_ROLES, LAUNCH_CITIES } from "@crew-hive/shared";
import { recruiterService } from "../../services/recruiterService.js";

export function CreateRequestScreen({ navigation, route, language, onToggleLanguage, t }) {
  const insets = useSafeAreaInsets();
  const preselectedCrew = route?.params?.preselectedCrew;
  const preselectedRole = route?.params?.preselectedRole;
  const preselectedCity = route?.params?.preselectedCity;

  const [projectTitle, setProjectTitle] = useState("");
  const [role, setRole] = useState(preselectedRole || "sound_engineer");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState(preselectedCity || "Kochi");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isMl = language === "ml";

  const handleSend = async () => {
    if (!projectTitle.trim()) {
      setError("Please provide a project or event title");
      return;
    }
    if (!startDate.trim()) {
      setError("Please specify the call dates");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const candidateIds = preselectedCrew?.id ? [preselectedCrew.id] : undefined;

      await recruiterService.createRequest({
        projectTitle: projectTitle.trim(),
        role,
        startDate: startDate.trim(),
        endDate: endDate.trim() || startDate.trim(),
        dates: `${startDate.trim()}${endDate.trim() ? ` - ${endDate.trim()}` : ""}`,
        location,
        dayRateOffered: budget ? Number(budget) : undefined,
        notes: notes.trim() || undefined,
        candidateIds,
      });

      toast.success(
        isMl
          ? "മാച്ചിംഗ് ടെക്നീഷ്യൻമാർക്ക് വിവരങ്ങൾ അയച്ചു. പ്രതികരണങ്ങൾ ട്രാക്കറിൽ കാണാം."
          : "Matching technicians have been pinged. Real-time responses will appear in your live tracker.",
        isMl ? "അന്വേഷണം അയച്ചു!" : "Availability Request Dispatched!"
      );
      navigation.navigate("RequestsSent");
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        "Failed to send request";
      setError(msg);
      toast.error(msg, isMl ? "അയക്കാൻ കഴിഞ്ഞില്ല" : "Dispatch Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <Header
        title={t ? t("recruiter.createRequestTitle", "New Availability Inquiry") : "New Availability Inquiry"}
        subtitle="Capped Multi-Candidate Dispatch"
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {preselectedCrew && (
          <Card style={styles.preselectedCard}>
            <Text style={styles.preselectedLabel}>
              {t ? t("recruiter.directCandidateSelected", "Direct Candidate Selected:") : "Direct Candidate Selected:"}
            </Text>
            <Text style={styles.preselectedName}>{preselectedCrew.name}</Text>
          </Card>
        )}

        <Input
          label={t ? t("recruiter.projectTitleLabel", "Project / Event Name *") : "Project / Event Name *"}
          placeholder={t ? t("recruiter.projectTitlePlaceholder", "e.g. Cochin Music Festival or Ad Shoot") : "e.g. Cochin Music Festival or Ad Shoot"}
          value={projectTitle}
          onChangeText={(txt) => {
            setProjectTitle(txt);
            if (error) setError("");
          }}
          error={error && !projectTitle.trim() ? error : ""}
        />

        {/* Role Selector */}
        <Text style={styles.fieldLabel}>
          {isMl ? "ആവശ്യമായ സാങ്കേതിക വിഭാഗം" : "Required AV Craft"}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roleChips}
        >
          {PARENT_ROLES.map((r) => {
            const isSelected = role === r.id;
            const roleName = isMl ? (r.nameMl || r.nameEn || r.name) : (r.nameEn || r.name);
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => setRole(r.id)}
                style={[
                  styles.roleChip,
                  isSelected && styles.selectedRoleChip,
                ]}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    isSelected && styles.selectedRoleChipText,
                  ]}
                >
                  {roleName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Themed Calendar Date Pickers */}
        <View style={styles.datesRow}>
          <View style={{ flex: 1 }}>
            <DatePickerModal
              label={t ? t("recruiter.startDateLabel", "Start Date *") : "Start Date *"}
              placeholder="DD/MM/YYYY"
              value={startDate}
              onChange={(val) => {
                setStartDate(val);
                if (error) setError("");
              }}
              isMl={isMl}
              disablePast={true}
              error={error && !startDate.trim() ? (isMl ? "തീയതി നിർബന്ധമാണ്" : "Date required") : ""}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DatePickerModal
              label={t ? t("recruiter.endDateLabel", "End Date (Optional)") : "End Date (Optional)"}
              placeholder="DD/MM/YYYY"
              value={endDate}
              onChange={setEndDate}
              isMl={isMl}
              disablePast={true}
            />
          </View>
        </View>

        {/* Location Hub */}
        <Text style={styles.fieldLabel}>
          {t ? t("recruiter.eventLocationHub", "Event Location Hub") : "Event Location Hub"}
        </Text>
        <View style={styles.cityPills}>
          {LAUNCH_CITIES.map((c, idx) => {
            const cityLabel = typeof c === "object" ? (isMl ? (c.nameMl || c.nameEn) : (c.nameEn || c.name)) : String(c);
            const cityValue = typeof c === "object" ? (c.nameEn || c.name) : String(c);
            const cityKey = typeof c === "object" ? (c.id || c.nameEn || `req_city_${idx}`) : `req_city_${idx}_${c}`;
            const isSelected = location === cityValue || location === cityLabel;
            return (
              <TouchableOpacity
                key={cityKey}
                onPress={() => setLocation(cityValue)}
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

        {/* Budget & Instructions */}
        <Input
          label={t ? t("recruiter.dayRateBudgetOffered", "Day Rate Budget Offered (₹ INR)") : "Day Rate Budget Offered (₹ INR)"}
          placeholder="e.g. 4000"
          value={budget}
          onChangeText={setBudget}
          keyboardType="numeric"
          helperText={isMl ? "ദിവസ നിരക്ക് വ്യക്തമാക്കുന്നത് വേഗത്തിൽ മറുപടി ലഭിക്കാൻ സഹായിക്കും." : "Indicating your day rate ensures higher and faster response rates."}
        />

        <Input
          label={t ? t("recruiter.specialInstructions", "Call Time & Logistics Notes") : "Call Time & Logistics Notes"}
          placeholder={t ? t("recruiter.specialInstructionsPlaceholder", "e.g. 7:00 AM call time at Bolgatty Palace, sound check by 11:00 AM") : "e.g. 7:00 AM call time at Bolgatty Palace, sound check by 11:00 AM"}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={{ height: 80 }}
        />

        {/* Capped candidate notice */}
        <Card style={styles.capNoticeCard}>
          <View style={styles.capRow}>
            <Badge label={isMl ? "പരമാവധി 10 പേർ" : "MAX 10 PINGS"} variant="amber" size="sm" />
            <Text style={styles.capTitle}>{isMl ? "ന്യായമായ വിതരണ ക്വാട്ട" : "Fair Dispatch Quota"}</Text>
          </View>
          <Text style={styles.capDesc}>
            {isMl
              ? `അനാവശ്യ മെസ്സേജുകൾ ഒഴിവാക്കാൻ, ${location}-ലെ ഈ വിഭാഗത്തിലുള്ള പരമാവധി 10 സാങ്കേതിക പ്രവർത്തകർക്ക് മാത്രമേ ഈ അന്വേഷണം അയയ്ക്കൂ.`
              : `To protect working crew from broadcast spam, this inquiry pings a maximum of 10 relevant, verified technicians matching this craft in ${location}.`}
          </Text>
        </Card>

        <Button
          title={loading ? (t ? t("common.loading", "Dispatching...") : "Dispatching...") : (t ? t("recruiter.dispatchInquiryBtn", "Dispatch Availability Request") : "Dispatch Availability Request")}
          variant="primary"
          size="lg"
          loading={loading}
          onPress={handleSend}
          style={styles.submitBtn}
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
  preselectedCard: {
    padding: 12,
    marginBottom: 16,
    backgroundColor: "rgba(245, 166, 35, 0.12)",
    borderWidth: 1,
    borderColor: Colors.accent.amber,
  },
  preselectedLabel: {
    fontSize: Typography.size.xs,
    color: Colors.accent.amber,
  },
  preselectedName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  fieldLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  roleChips: {
    gap: 8,
    paddingBottom: 12,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.raised,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  selectedRoleChip: {
    borderColor: Colors.accent.amber,
    backgroundColor: "rgba(245, 166, 35, 0.2)",
  },
  roleChipText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  selectedRoleChipText: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.bold,
  },
  datesRow: {
    flexDirection: "row",
    gap: 12,
  },
  cityPills: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  cityPill: {
    flex: 1,
    height: 46,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.raised,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedCityPill: {
    borderColor: Colors.accent.amber,
    backgroundColor: "rgba(245, 166, 35, 0.2)",
  },
  cityText: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  selectedCityText: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.bold,
  },
  capNoticeCard: {
    padding: 14,
    marginBottom: 20,
    backgroundColor: Colors.surface.raised,
  },
  capRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  capTitle: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  capDesc: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: 4,
  },
});

export default CreateRequestScreen;

