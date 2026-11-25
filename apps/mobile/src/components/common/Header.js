/**
 * apps/mobile/src/components/common/Header.js
 * App header bar with back button, screen title, brand mark, and language switcher.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";

export function Header({
  title,
  subtitle,
  showBack = false,
  onBack = null,
  rightAction = null,
  language = "en",
  onToggleLanguage = null,
}) {
  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backButton}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.brandMark}>
            <Text style={styles.brandGlyph}>C</Text>
          </View>
        )}

        <View style={styles.titleColumn}>
          <Text
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.75}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={styles.subtitle}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.75}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightContainer}>
        {onToggleLanguage && (
          <TouchableOpacity
            onPress={onToggleLanguage}
            style={styles.langPill}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={language === "en" ? styles.langActive : styles.langInactive}>
              <Text style={language === "en" ? styles.langTextActive : styles.langTextInactive}>EN</Text>
            </View>
            <View style={language === "ml" ? styles.langActive : styles.langInactive}>
              <Text style={language === "ml" ? styles.langTextActive : styles.langTextInactive}>മല</Text>
            </View>
          </TouchableOpacity>
        )}
        {rightAction}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    backgroundColor: Colors.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.base,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandGlyph: {
    color: Colors.text.inverse,
    fontWeight: "900",
    fontSize: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text.white,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langPill: {
    flexDirection: "row",
    backgroundColor: Colors.bg.elevated,
    borderRadius: Radius.lg,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.border.base,
  },
  langActive: {
    backgroundColor: Colors.brand.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  langInactive: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  langTextActive: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text.inverse,
  },
  langTextInactive: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.text.secondary,
  },
});

export default Header;

