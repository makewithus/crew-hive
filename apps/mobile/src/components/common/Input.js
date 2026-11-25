/**
 * apps/mobile/src/components/common/Input.js
 * Mobile text input primitive with dark surface, 48px touch height, focus ring, and validation error state.
 */

import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  keyboardType = "default",
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style = null,
  inputStyle = null,
  editable = true,
  ...rest
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.muted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        editable={editable}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...rest}
        style={[
          styles.input,
          multiline && styles.multilineInput,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          !editable && styles.inputDisabled,
          inputStyle,
        ]}
      />

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  input: {
    height: Dimensions.inputHeight,
    minHeight: Dimensions.minTouchTarget,
    backgroundColor: Colors.bg.elevated,
    borderWidth: 1,
    borderColor: Colors.border.base,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.text.primary,
  },
  multilineInput: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top",
  },
  inputFocused: {
    borderColor: Colors.border.focus,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: Colors.status.declined,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    color: Colors.status.declined,
    marginTop: 4,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 4,
  },
});

export default Input;

