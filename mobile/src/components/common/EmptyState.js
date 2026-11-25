/**
 * apps/mobile/src/components/common/EmptyState.js
 * Meaningful empty states with domain messaging and action buttons.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Typography } from "../../constants/theme.js";
import Button from "./Button.js";

export function EmptyState({
  title,
  description,
  actionTitle = null,
  onAction = null,
  icon = null,
  style = null,
}) {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionTitle && onAction && (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="sm"
          style={styles.actionBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginBottom: 16,
    opacity: 0.8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  actionBtn: {
    marginTop: 8,
  },
});

export default EmptyState;

