/**
 * apps/mobile/src/components/common/Button.js
 * Primary, secondary, success, destructive, and WhatsApp button primitives adhering to BRANDING.md.
 * Ensures 44px+ minimum hit target and tactile active feedback.
 */

import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Colors, Radius, Typography, Dimensions, Shadows } from "../../constants/theme.js";

export function Button({
  title,
  onPress,
  variant = "primary", // primary | secondary | outline | success | destructive | danger | whatsapp | ghost
  size = "default",    // sm | default | lg
  loading = false,
  disabled = false,
  icon = null,
  style = null,
  textStyle = null,
}) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isOutline = variant === "outline";
  const isSuccess = variant === "success";
  const isDestructive = variant === "destructive" || variant === "danger";
  const isWhatsApp = variant === "whatsapp";
  const isGhost = variant === "ghost";

  const containerStyles = [
    styles.base,
    isPrimary && styles.primary,
    isSecondary && styles.secondary,
    isOutline && styles.outline,
    isSuccess && styles.success,
    isDestructive && styles.destructive,
    isWhatsApp && styles.whatsapp,
    isGhost && styles.ghost,
    size === "sm" && styles.sizeSm,
    size === "lg" && styles.sizeLg,
    disabled && styles.disabled,
    style,
  ];

  const labelStyles = [
    styles.label,
    isPrimary && styles.primaryText,
    isSecondary && styles.secondaryText,
    isOutline && styles.outlineText,
    isSuccess && styles.successText,
    isDestructive && styles.destructiveText,
    isWhatsApp && styles.whatsappText,
    isGhost && styles.ghostText,
    size === "sm" && styles.labelSm,
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={containerStyles}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? Colors.text.inverse : Colors.text.primary} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={labelStyles}
            numberOfLines={2}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Dimensions.buttonHeight || 48,
    borderRadius: Radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  primary: {
    backgroundColor: Colors.brand.primary,
    ...Shadows.primaryButton,
  },
  secondary: {
    backgroundColor: Colors.bg.surface,
    borderWidth: 1,
    borderColor: Colors.border.base,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.brand.primaryBorder,
  },
  success: {
    backgroundColor: Colors.status.available,
  },
  destructive: {
    backgroundColor: Colors.status.declinedBg,
    borderWidth: 1,
    borderColor: Colors.status.declinedBorder,
  },
  whatsapp: {
    backgroundColor: "rgba(37, 211, 102, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(37, 211, 102, 0.30)",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  sizeSm: {
    minHeight: 36,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  sizeLg: {
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    color: Colors.text.primary,
    flexShrink: 1,
  },
  primaryText: {
    color: Colors.text.inverse,
  },
  secondaryText: {
    color: Colors.text.primary,
  },
  outlineText: {
    color: Colors.accent.amber,
  },
  successText: {
    color: "#FFFFFF",
  },
  destructiveText: {
    color: Colors.status.declined,
  },
  whatsappText: {
    color: Colors.brand.whatsapp,
  },
  ghostText: {
    color: Colors.text.secondary,
  },
  labelSm: {
    fontSize: 13,
  },
});

export default Button;

