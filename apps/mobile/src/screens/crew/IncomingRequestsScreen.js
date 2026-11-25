/**
 * apps/mobile/src/screens/crew/IncomingRequestsScreen.js
 * Incoming recruiter availability inquiries with YES / NO response handling.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import Button from "../../components/common/Button.js";
import EmptyState from "../../components/common/EmptyState.js";
import { toast } from "../../components/common/Toast.js";
import { confirmModal } from "../../components/common/ThemedModal.js";
import { ClockIcon, MapPinIcon, BriefcaseIcon, CheckIcon, XIcon } from "../../components/common/AvIcons.js";
import { crewService } from "../../services/crewService.js";
import { findRoleOrSpecialisation, LAUNCH_CITIES, KERALA_DISTRICTS } from "@crew-hive/shared";

export function IncomingRequestsScreen({ navigation, language, onToggleLanguage, t }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const hasPromptedDeclineRef = useRef(false);

  const isMl = language === "ml";

  const promptTurnOffAvailability = useCallback(() => {
    confirmModal({
      title: isMl ? "ലഭ്യത ഓഫാക്കണോ?" : "Turn Off Availability?",
      message: isMl
        ? "നിങ്ങൾ അടുത്തിടെയുള്ള പല അന്വേഷണങ്ങളും നിരസിക്കുകയോ മറുപടി നൽകാതിരിക്കുകയോ ചെയ്തിട്ടുണ്ട്. നിങ്ങൾക്ക് തിരക്കാണെങ്കിൽ അനാവശ്യ അന്വേഷണങ്ങൾ ഒഴിവാക്കാൻ ലഭ്യത ഓഫ് ചെയ്യണോ?"
        : "You have declined or missed multiple recent inquiries. Would you like to switch your availability off so you don't receive urgent requests?",
      confirmText: isMl ? "ലഭ്യത ഓഫ് ചെയ്യുക" : "Turn Availability Off",
      cancelText: isMl ? "പിന്നീട് ചോദിക്കുക" : "Keep On",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await crewService.toggleAvailability({ availableNow: false });
          toast.info(
            isMl
              ? "അടിയന്തര അന്വേഷണങ്ങളിൽ നിന്ന് നിങ്ങളുടെ പ്രൊഫൈൽ ഓഫ് ചെയ്തിരിക്കുന്നു."
              : "Your profile is now offline and will not receive urgent pings.",
            isMl ? "ലഭ്യത ഓഫ് ചെയ്തു" : "Availability Off"
          );
        } catch (_) {}
      },
    });
  }, [isMl]);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await crewService.getIncomingRequests();
      setRequests(data || []);
      if (data?.shouldPromptAvailabilityReview && !hasPromptedDeclineRef.current) {
        hasPromptedDeclineRef.current = true;
        setTimeout(() => promptTurnOffAvailability(), 600);
      }
    } catch (err) {
      // offline fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [promptTurnOffAvailability]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleRespond = async (requestId, responseType) => {
    const isYes = responseType === "YES";
    confirmModal({
      title: isYes
        ? (isMl ? "ലഭ്യത സ്ഥിരീകരിക്കുക (YES)" : "Confirm Availability (YES)")
        : (isMl ? "അന്വേഷണം നിരസിക്കുക (NO)" : "Decline Inquiry (NO)"),
      message: isYes
        ? (isMl
            ? "YES നൽകുന്നതിലൂടെ നിങ്ങൾ ലഭ്യമാണെന്ന് സ്ഥിരീകരിക്കുന്നു. നേരിട്ട് ബന്ധപ്പെടാൻ റിക്രൂട്ടർക്ക് നിങ്ങളുടെ ഫോൺ നമ്പർ നൽകും."
            : "By tapping YES, you confirm you are available. Your phone number will be disclosed to the recruiter for direct call coordination.")
        : (isMl
            ? "NO നൽകുന്നതിലൂടെ ഈ തീയതിയിൽ നിങ്ങൾക്ക് ഒഴിവില്ലെന്ന് റിക്രൂട്ടറെ അറിയിക്കും."
            : "By tapping NO, you notify the recruiter you are unavailable for this date."),
      confirmText: isYes
        ? (isMl ? "സ്ഥിരീകരിക്കുക (YES)" : "Confirm YES")
        : (isMl ? "നിരസിക്കുക (NO)" : "Decline NO"),
      cancelText: t ? t("common.cancel", "Cancel") : "Cancel",
      variant: isYes ? "primary" : "destructive",
      onConfirm: async () => {
        setActionLoadingId(requestId);
        try {
          await crewService.respondToRequest(requestId, responseType);
          setRequests((prev) =>
            prev.map((r) =>
              r.id === requestId
                ? {
                    ...r,
                    status: isYes ? "accepted" : "declined",
                    myResponse: responseType,
                  }
                : r
            )
          );
          if (isYes) {
            toast.success(
              isMl
                ? "റിക്രൂട്ടറെ അറിയിച്ചു കഴിഞ്ഞു. വിശദാംശങ്ങൾക്ക് അവർ നിങ്ങളെ ഉടൻ വിളിക്കും."
                : "The recruiter has been notified and may call you directly to confirm logistics.",
              isMl ? "അന്വേഷണം സ്വീകരിച്ചു!" : "Inquiry Accepted!"
            );
          } else {
            toast.info(
              isMl
                ? "മറുപടി നൽകിയതിന് നന്ദി. ഇത് നിങ്ങളുടെ റെസ്പോൺസ് റേറ്റ് ഉയർത്തും."
                : "Thank you for the quick response. This keeps your response rate high.",
              isMl ? "അന്വേഷണം നിരസിച്ചു" : "Inquiry Declined"
            );
          }
          if (!isYes && !hasPromptedDeclineRef.current) {
            hasPromptedDeclineRef.current = true;
            setTimeout(() => promptTurnOffAvailability(), 1200);
          }
        } catch (err) {
          const msg =
            err.response?.data?.error?.message ||
            err.message ||
            "Failed to submit response";
          toast.error(msg, isMl ? "പിശക്" : "Error");
        } finally {
          setActionLoadingId(null);
        }
      },
    });
  };

  const renderRequestItem = ({ item }) => {
    const isPending = item.status === "pending" || !item.myResponse;
    const isAccepted = item.myResponse === "YES" || item.status === "accepted";
    const isDeclined = item.myResponse === "NO" || item.status === "declined";
    const isActionLoading = actionLoadingId === item.id;

    const craftLookup = item.role ? findRoleOrSpecialisation(item.role, language) : null;
    const roleLabel = (craftLookup?.label || (item.role || "Sound Engineer")).replace(/_/g, " ").toUpperCase();

    const rawLoc = item.location || item.city || "Kerala";
    const locMatch =
      LAUNCH_CITIES.find((c) => (c.nameEn || c.name || "").toLowerCase() === String(rawLoc).toLowerCase()) ||
      KERALA_DISTRICTS.find((d) => (d.nameEn || d.name || "").toLowerCase() === String(rawLoc).toLowerCase());
    const locDisplay = isMl ? (locMatch?.nameMl || rawLoc) : (locMatch?.nameEn || rawLoc);

    return (
      <Card style={styles.requestCard}>
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            <Text style={styles.projectTitle}>{item.projectTitle || (isMl ? "ഓഡിയോ-വിഷ്വൽ പ്രൊഡക്ഷൻ" : "Audio-Visual Production")}</Text>
            <Text style={styles.recruiterName}>
              {isMl ? "റിക്രൂട്ടർ: " : "By "}
              {item.recruiterName || item.companyName || (isMl ? "അംഗീകൃത റിക്രൂട്ടർ" : "Verified Recruiter")}
            </Text>
          </View>
          <Badge
            label={
              isAccepted
                ? (t ? t("crew.confirmedYesStatus", "CONFIRMED (YES)") : "CONFIRMED (YES)")
                : isDeclined
                ? (t ? t("crew.declinedNoStatus", "DECLINED (NO)") : "DECLINED (NO)")
                : (t ? t("crew.pendingDecision", "PENDING") : "PENDING")
            }
            variant={isAccepted ? "green" : isDeclined ? "neutral" : "amber"}
            size="sm"
          />
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <BriefcaseIcon size={16} color={Colors.accent.amber} />
            <Text style={styles.detailText}>
              {t ? t("crew.rolePrefix", "Role: ") : "Role: "}
              {roleLabel}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <ClockIcon size={16} color={Colors.accent.amber} />
            <Text style={styles.detailText}>
              {t ? t("crew.datesPrefix", "Dates: ") : "Dates: "}
              {item.dates || `${item.startDate || (isMl ? "ഉടൻ" : "Upcoming")} - ${item.endDate || "TBD"}`}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MapPinIcon size={16} color={Colors.accent.amber} />
            <Text style={styles.detailText}>
              {t ? t("crew.locationPrefix", "Location: ") : "Location: "}
              {locDisplay}
            </Text>
          </View>
        </View>

        {item.dayRateOffered && (
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>
              {t ? t("crew.rateOfferedPrefix", "Budget Offered: ") : "Budget Offered: "}
            </Text>
            <Text style={styles.budgetValue}>
              ₹{Number(item.dayRateOffered).toLocaleString("en-IN")} {t ? t("common.day", "/ day") : "/ day"}
            </Text>
          </View>
        )}

        {item.notes && (
          <Text style={styles.notesText}>&quot;{item.notes}&quot;</Text>
        )}

        {isPending ? (
          <View style={styles.actionButtons}>
            <View style={{ flex: 1 }}>
              <Button
                title={t ? t("crew.declineInquiry", "Decline (NO)") : "Decline (NO)"}
                variant="ghost"
                size="md"
                disabled={isActionLoading}
                onPress={() => handleRespond(item.id, "NO")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={t ? t("crew.acceptAndShareContact", "Available (YES)") : "Available (YES)"}
                variant="primary"
                size="md"
                disabled={isActionLoading}
                loading={isActionLoading}
                onPress={() => handleRespond(item.id, "YES")}
              />
            </View>
          </View>
        ) : (
          <View style={styles.respondedBox}>
            {isAccepted ? (
              <CheckIcon size={14} color={Colors.semantic.success} />
            ) : (
              <XIcon size={14} color={Colors.semantic.error} />
            )}
            <Text style={styles.respondedText}>
              {isAccepted
                ? (t ? t("crew.inquiryAcceptedNotice", "You accepted this inquiry. Recruiter can contact you directly.") : "You accepted this inquiry. Recruiter can contact you directly.")
                : (t ? t("crew.inquiryDeclinedNotice", "You declined this inquiry.") : "You declined this inquiry.")}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title={t ? t("crew.incomingRequests", "Availability Inquiries") : "Availability Inquiries"}
        subtitle={t ? t("crew.inquiriesSubtitle", "Incoming calls from verified recruiters") : "Incoming calls from verified recruiters"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <View style={styles.content}>
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id || String(Math.random())}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.accent.amber}
            />
          }
          ListEmptyComponent={
            !loading && (
              <EmptyState
                title={t ? t("crew.noPendingInquiriesTitle", "No Pending Inquiries") : "No Pending Inquiries"}
                description={t ? t("crew.noPendingInquiriesDesc", "When event organizers and production houses search for your craft in your district, incoming requests will appear here.") : "When event organizers and production houses search for your craft in your district, incoming requests will appear here."}
                actionLabel={t ? t("crew.refreshInquiries", "Refresh Inquiries") : "Refresh Inquiries"}
                onAction={handleRefresh}
              />
            )
          }
        />
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
  },
  listContent: {
    padding: Dimensions.screenPadding,
    paddingBottom: 24,
    gap: 14,
  },
  requestCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleWrap: {
    flex: 1,
    marginRight: 8,
  },
  projectTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  recruiterName: {
    fontSize: Typography.size.xs,
    color: Colors.accent.amber,
    marginTop: 2,
  },
  detailsGrid: {
    backgroundColor: Colors.surface.raised,
    padding: 12,
    borderRadius: Radius.md,
    gap: 8,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    marginBottom: 6,
  },
  budgetLabel: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  budgetValue: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  notesText: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    fontStyle: "italic",
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  respondedBox: {
    marginTop: 6,
    padding: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.raised,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  respondedText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    fontWeight: Typography.weight.medium,
  },
});

export default IncomingRequestsScreen;

