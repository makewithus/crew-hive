/**
 * apps/mobile/src/screens/shared/NotificationsScreen.js
 * In-app notification center fetching real notifications from Express API.
 */

import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import EmptyState from "../../components/common/EmptyState.js";
import { api } from "../../services/api.js";

export function NotificationsScreen({ navigation, language, onToggleLanguage, t }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isMl = language === "ml";

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications", { cache: true });
      if (Array.isArray(res.items)) setNotifications(res.items);
    } catch (err) {
      // In offline or initial empty state, retain existing
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
    } catch (err) {
      // ignore
    }
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.read;
    const dateFormatted = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "";

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => markAsRead(item.id)}
      >
        <Card
          style={[
            styles.notificationCard,
            isUnread && styles.unreadCard,
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              {isUnread && <View style={styles.unreadDot} />}
              <Text style={styles.itemTitle}>{item.title}</Text>
            </View>
            <Text style={styles.itemDate}>{dateFormatted}</Text>
          </View>
          <Text style={styles.itemBody}>{item.body}</Text>
          {item.type && (
            <View style={styles.tagWrapper}>
              <Badge
                label={item.type.replace(/_/g, " ").toUpperCase()}
                variant={isUnread ? "amber" : "neutral"}
                size="sm"
              />
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t ? t("settings.notifications", "Notifications") : "Notifications"}
        subtitle={isMl ? "അറിയിപ്പുകളും അപ്‌ഡേറ്റുകളും" : "In-app alerts and updates"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <View style={styles.content}>
        <FlatList
          data={notifications}
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
                title={isMl ? "പുതിയ അറിയിപ്പുകൾ ഇല്ല" : "No Notifications"}
                description={isMl ? "നിങ്ങൾ എല്ലാം കണ്ടുകഴിഞ്ഞു. പുതിയ അന്വേഷണങ്ങളും അറിയിപ്പുകളും ഇവിടെ കാണാം." : "You are all caught up! New inquiries, matches, and system notices will appear here."}
                actionLabel={isMl ? "വീണ്ടും പരിശോധിക്കുക" : "Refresh"}
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
    gap: 12,
  },
  notificationCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  unreadCard: {
    borderColor: Colors.accent.amber,
    backgroundColor: Colors.surface.raised,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent.amber,
  },
  itemTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
    flex: 1,
  },
  itemDate: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
  },
  itemBody: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  tagWrapper: {
    alignSelf: "flex-start",
  },
});

export default NotificationsScreen;

