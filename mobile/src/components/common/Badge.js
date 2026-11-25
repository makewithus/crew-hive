/**
 * apps/mobile/src/components/common/Badge.js
 * Status chip and role badge primitive adhering to BRANDING.md standards.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Radius, Typography } from "../../constants/theme.js";

export function Badge({
  label,
  variant = "role", // role | available | busy | pending | association | amber | green | neutral | danger
  size = "default", // sm | default
  style = null,
  textStyle = null,
}) {
  const isAvailable = variant === "available" || variant === "green" || variant === "success";
  const isPending = variant === "pending" || variant === "amber" || variant === "warning";
  const isNeutral = variant === "neutral" || variant === "busy";
  const isDanger = variant === "danger" || variant === "destructive" || variant === "error";
  const isAssociation = variant === "association";
  const isRole = variant === "role";

  // Pip display (for status badges where a dot indicator is useful)
  const showPip = variant === "available" || variant === "busy" || variant === "pending";

  return (
    <View
      style={[
        styles.badge,
        size === "sm" && styles.badgeSm,
        isRole && styles.roleBadge,
        isAvailable && styles.availableBadge,
        isPending && styles.pendingBadge,
        isNeutral && !isPending && !isAvailable && styles.neutralBadge,
        isDanger && styles.dangerBadge,
        isAssociation && styles.assocBadge,
        style,
      ]}
    >
      {showPip && (
        <View
          style={[
            styles.pip,
            isAvailable && styles.availablePip,
            variant === "busy" && styles.busyPip,
            isPending && styles.pendingPip,
          ]}
        />
      )}

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={true}
        minimumFontScale={0.8}
        style={[
          styles.text,
          size === "sm" && styles.textSm,
          isRole && styles.roleText,
          isAvailable && styles.availableText,
          isPending && styles.pendingText,
          isNeutral && !isPending && !isAvailable && styles.neutralText,
          isDanger && styles.dangerText,
          isAssociation && styles.assocText,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: 5,
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  roleBadge: {
    backgroundColor: Colors.brand.primaryLight,
    borderWidth: 1,
    borderColor: Colors.brand.primaryBorder,
    borderRadius: Radius.sm,
  },
  availableBadge: {
    backgroundColor: Colors.status.availableBg,
    borderWidth: 1,
    borderColor: Colors.status.availableBorder,
  },
  pendingBadge: {
    backgroundColor: "rgba(245, 166, 35, 0.20)",
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.45)",
  },
  neutralBadge: {
    backgroundColor: "rgba(161, 161, 170, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(161, 161, 170, 0.25)",
  },
  dangerBadge: {
    backgroundColor: Colors.status.declinedBg,
    borderWidth: 1,
    borderColor: Colors.status.declinedBorder,
  },
  assocBadge: {
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.25)",
    borderRadius: Radius.sm,
  },
  pip: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availablePip: {
    backgroundColor: Colors.status.available,
  },
  busyPip: {
    backgroundColor: Colors.status.busy,
  },
  pendingPip: {
    backgroundColor: Colors.accent.amber,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  textSm: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  roleText: {
    color: Colors.brand.primary,
  },
  availableText: {
    color: Colors.status.available,
  },
  pendingText: {
    color: "#FBBF24", // Bright vibrant amber gold for crystal-clear readability
  },
  neutralText: {
    color: Colors.text.secondary,
  },
  dangerText: {
    color: Colors.status.declined,
  },
  assocText: {
    color: Colors.roles.association,
  },
});

export default Badge;

