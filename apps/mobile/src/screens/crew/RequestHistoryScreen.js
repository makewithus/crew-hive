/**
 * apps/mobile/src/screens/crew/RequestHistoryScreen.js
 * Historical archive of past availability requests and gigs.
 */

import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import EmptyState from "../../components/common/EmptyState.js";
import { crewService } from "../../services/crewService.js";

export function RequestHistoryScreen({ navigation, language, onToggleLanguage, t }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await crewService.getIncomingRequests();
      const past = (data || []).filter((r) => r.status !== "pending");
      setHistory(past);
    } catch (err) {
      // offline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const renderItem = ({ item }) => {
    const isAccepted = item.status === "accepted" || item.myResponse === "YES";
    return (
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.projectTitle}>{item.projectTitle || (language === "ml" ? "ഓഡിയോ-വിഷ്വൽ പ്രൊഡക്ഷൻ" : "Audio-Visual Production")}</Text>
          <Badge
            label={isAccepted ? (t ? t("crew.confirmedYesStatus", "ACCEPTED") : "ACCEPTED") : (t ? t("crew.declinedNoStatus", "DECLINED") : "DECLINED")}
            variant={isAccepted ? "green" : "neutral"}
            size="sm"
          />
        </View>
        <Text style={styles.metaText}>
          {item.companyName || item.recruiterName || (language === "ml" ? "റിക്രൂട്ടർ" : "Recruiter")} • {item.location || item.city || (language === "ml" ? "കേരളം" : "Kerala")}
        </Text>
        <Text style={styles.dateText}>
          {t ? t("crew.datesPrefix", "Dates: ") : "Dates: "}
          {item.dates || `${item.startDate || ""} - ${item.endDate || ""}`}
        </Text>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t ? t("crew.inquiryHistory", "Inquiry History") : "Inquiry History"}
        subtitle={t ? t("crew.archivedGigs", "Archived gig requests") : "Archived gig requests"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <View style={styles.content}>
        <FlatList
          data={history}
          keyExtractor={(item) => item.id || String(Math.random())}
          renderItem={renderItem}
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
                title={t ? t("crew.noHistoryYet", "No History Yet") : "No History Yet"}
                description={t ? t("crew.noHistoryDesc", "Past answered requests and finalized gigs will be saved here.") : "Past answered requests and finalized gigs will be saved here."}
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
    gap: 12,
  },
  card: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  projectTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  metaText: {
    fontSize: Typography.size.xs,
    color: Colors.accent.amber,
    marginBottom: 4,
  },
  dateText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
});

export default RequestHistoryScreen;

