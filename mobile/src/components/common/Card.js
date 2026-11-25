/**
 * apps/mobile/src/components/common/Card.js
 * Surface container primitive with 16px radius and dark carbon background (#141414).
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Colors, Radius, Shadows } from "../../constants/theme.js";

export function Card({ children, style = null }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.surface,
    borderWidth: 1,
    borderColor: Colors.border.base,
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
});

export default Card;

