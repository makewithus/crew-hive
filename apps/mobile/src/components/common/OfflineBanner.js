/**
 * apps/mobile/src/components/common/OfflineBanner.js
 * Persistent weak-network / offline banner communicating cached data status.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/theme.js";
import { ZapIcon } from "./AvIcons.js";

export function OfflineBanner({ visible = false, message = null }) {
  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <ZapIcon size={16} color={Colors.accent.amber} />
      <Text style={styles.text}>
        {message || "You are currently offline. Showing cached results."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderBottomWidth: 1,
    borderBottomColor: Colors.status.pendingBorder,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  icon: {
    fontSize: 12,
  },
  text: {
    color: Colors.status.pending,
    fontSize: 12,
    fontWeight: "600",
  },
});

export default OfflineBanner;

