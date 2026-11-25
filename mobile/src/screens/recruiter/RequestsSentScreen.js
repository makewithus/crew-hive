/**
 * apps/mobile/src/screens/recruiter/RequestsSentScreen.js
 * Live response tracker revealing phone numbers for confirmed YES responses.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, FlatList, RefreshControl, Linking, TouchableOpacity, AppState } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import Button from "../../components/common/Button.js";
import EmptyState from "../../components/common/EmptyState.js";
import { PhoneIcon, WhatsAppIcon, ClockIcon } from "../../components/common/AvIcons.js";
import { recruiterService } from "../../services/recruiterService.js";

export function RequestsSentScreen({ navigation, language, onToggleLanguage, t }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isPollingRef = useRef(false);

  const isMl = language === "ml";

  const fetchSent = useCallback(async (isSilent = false) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    try {
      const data = await recruiterService.getMySentRequests();
      setRequests(data || []);
    } catch (err) {
      // offline
    } finally {
      if (!isSilent) {
        setLoading(false);
        setRefreshing(false);
      }
      isPollingRef.current = false;
    }
  }, []);

  // Initial fetch and 8s real-time polling interval
  useEffect(() => {
    fetchSent(false);

    let intervalId = null;
    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          fetchSent(true);
        }, 8000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    startPolling();

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        fetchSent(true);
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      stopPolling();
      if (appStateSub?.remove) appStateSub.remove();
    };
  }, [fetchSent]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSent(false);
  };

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\D/g, "")}`);
  };

  const handleWhatsApp = (phone, title) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Hi! Following up regarding the CrewHive booking for "${title}".`);
    Linking.openURL(`https://wa.me/${clean}?text=${msg}`);
  };

  const renderRequestCard = ({ item }) => {
    const candidates = item.candidates || [];
    const acceptedCandidates = candidates.filter((c) => c.status === "accepted" || c.response === "YES");
    const hasAccepted = acceptedCandidates.length > 0;

    return (
      <Card style={styles.requestCard}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.projectTitle}>{item.projectTitle}</Text>
            <Text style={styles.craftLocation}>
              {(item.role || "Technician").replace(/_/g, " ").toUpperCase()} • {item.location || (isMl ? "കേരളം" : "Kerala")}
            </Text>
          </View>
          <Badge
            label={`${candidates.length} ${isMl ? "അന്വേഷണങ്ങൾ" : "CANDIDATE PINGS"}`}
            variant="amber"
            size="sm"
          />
        </View>

        <Text style={styles.datesText}>
          {t ? t("crew.datesPrefix", "Dates: ") : "Dates: "}
          {item.dates || (isMl ? "ഷെഡ്യൂൾ ചെയ്ത വർക്ക്" : "Scheduled Call")}
        </Text>

        {/* Candidate Response Status Cards */}
        <Text style={styles.subHeading}>
          {isMl ? "വിദഗ്ദ്ധരുടെ മറുപടി" : "CANDIDATE RESPONSES"}
        </Text>

        <View style={styles.candidatesList}>
          {candidates.map((cand, idx) => {
            const isYes = cand.status === "accepted" || cand.response === "YES";
            const isNo = cand.status === "declined" || cand.response === "NO";

            return (
              <View
                key={cand.crewId || String(idx)}
                style={[
                  styles.candidateRow,
                  isYes && styles.candidateYesRow,
                ]}
              >
                <View style={styles.candInfo}>
                  <Text style={styles.candName}>{cand.name || (isMl ? `വിദഗ്ദ്ധൻ #${idx + 1}` : `Candidate #${idx + 1}`)}</Text>
                  <Text style={styles.candCity}>{cand.city || item.location || (isMl ? "കേരളം" : "Kerala")}</Text>
                </View>

                <View style={styles.candStatus}>
                  {isYes ? (
                    <Badge label={isMl ? "ലഭ്യമാണ് (YES)" : "AVAILABLE (YES)"} variant="green" size="sm" />
                  ) : isNo ? (
                    <Badge label={isMl ? "ലഭ്യമല്ല (NO)" : "DECLINED (NO)"} variant="neutral" size="sm" />
                  ) : (
                    <Badge label={isMl ? "മറുപടി കാക്കുന്നു" : "PENDING PING"} variant="amber" size="sm" />
                  )}
                </View>

                {/* Direct Contact Buttons revealed when YES */}
                {isYes && cand.phone && (
                  <View style={styles.directContactRow}>
                    <TouchableOpacity
                      style={styles.callPill}
                      onPress={() => handleCall(cand.phone)}
                    >
                      <PhoneIcon size={14} color="#000000" />
                      <Text style={styles.callPillText}>{isMl ? "വിളിക്കുക " : "Call "}{cand.phone}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.waPill}
                      onPress={() => handleWhatsApp(cand.phone, item.projectTitle)}
                    >
                      <WhatsAppIcon size={14} color="#FFFFFF" />
                      <Text style={styles.waPillText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Suggestion banner if no confirmed responses yet */}
        {!hasAccepted && (
          <View style={styles.suggestionBox}>
            <ClockIcon size={16} color={Colors.accent.amber} />
            <Text style={styles.suggestionText}>
              {isMl
                ? "മറുപടികൾക്കായി കാക്കുന്നു. ആവശ്യമെങ്കിൽ ദിവസ വേതനമോ തിരയൽ ദൂരമോ മാറ്റാം."
                : "Awaiting replies. If needed, try widening your search radius or adjusting your day rate budget."}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Header
        title={t ? t("recruiter.recentInquiries", "Dispatched Inquiries") : "Dispatched Inquiries"}
        subtitle={isMl ? "തത്സമയ ലഭ്യത ട്രാക്കർ" : "Real-time crew availability tracker"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <View style={styles.content}>
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id || String(Math.random())}
          renderItem={renderRequestCard}
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
                title={isMl ? "അന്വേഷണങ്ങൾ ഒന്നും അയച്ചിട്ടില്ല" : "No Dispatched Requests"}
                description={isMl ? "നിങ്ങൾ ലഭ്യത അന്വേഷണം അയക്കുമ്പോൾ, സാങ്കേതിക പ്രവർത്തകരുടെ മറുപടികളും ഫോൺ നമ്പറും ഇവിടെ കാണാം." : "When you create an availability inquiry, live candidate responses and revealed contacts will appear here."}
                actionLabel={isMl ? "ആദ്യ അന്വേഷണം അയക്കുക" : "Dispatch First Inquiry"}
                onAction={() => navigation.navigate("CreateRequest")}
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
    gap: 16,
  },
  requestCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  projectTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  craftLocation: {
    fontSize: Typography.size.xs,
    color: Colors.accent.amber,
    marginTop: 2,
  },
  datesText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    marginBottom: 12,
  },
  subHeading: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  candidatesList: {
    gap: 8,
  },
  candidateRow: {
    backgroundColor: Colors.surface.raised,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  candidateYesRow: {
    borderColor: Colors.semantic.success,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  candInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  candName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  candCity: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
  },
  candStatus: {
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  directContactRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  callPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.accent.amber,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  callPillText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: "#000000",
  },
  waPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#25D366",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  waPillText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: "#FFFFFF",
  },
  suggestionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.raised,
  },
  suggestionText: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    flex: 1,
    lineHeight: 16,
  },
});

export default RequestsSentScreen;

