/**
 * apps/mobile/src/components/common/ThemedModal.js
 * Theme-matching confirmation dialog and custom modal container.
 * Replaces unstyled native white Alert popups with sleek, dark-gold/destructive CrewHive dialogs.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions as RNDimensions,
  ActivityIndicator,
} from "react-native";
import Svg, { Path, Circle, Line } from "react-native-svg";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";

// Global dialog listener
let dialogListener = null;

/**
 * Show a themed confirmation modal imperatively from anywhere in the app.
 * @param {Object} options
 * @param {string} options.title
 * @param {string} [options.message]
 * @param {string} [options.confirmText='Confirm']
 * @param {string} [options.cancelText='Cancel']
 * @param {'destructive' | 'primary' | 'warning'} [options.variant='primary']
 * @param {'danger' | 'warning' | 'info' | 'help'} [options.iconType]
 * @param {() => Promise<void> | void} options.onConfirm
 * @param {() => void} [options.onCancel]
 */
export function showConfirmDialog(options) {
  if (dialogListener) {
    dialogListener(options);
  }
}

export const confirmModal = showConfirmDialog;

function DangerIcon({ size = 24, color = Colors.semantic.error }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="16" r="1" fill={color} />
    </Svg>
  );
}

function WarningIcon({ size = 24, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.29 3.86L1.82 18A2 2 0 003.54 21H20.46A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="17" r="1" fill={color} />
    </Svg>
  );
}

function InfoIcon({ size = 24, color = "#3B82F6" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Line x1="12" y1="16" x2="12" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="8" r="1" fill={color} />
    </Svg>
  );
}

/**
 * Reusable controlled ThemedModal component.
 */
export function ThemedModal({
  visible = false,
  title,
  message,
  icon,
  iconType,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  loading = false,
  onConfirm,
  onCancel,
  children,
}) {
  if (!visible) return null;

  const isDestructive = variant === "destructive";

  const renderIcon = () => {
    if (icon) return icon;
    if (iconType === "danger" || isDestructive) return <DangerIcon />;
    if (iconType === "warning") return <WarningIcon />;
    if (iconType === "info") return <InfoIcon />;
    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Header Icon + Title */}
              <View style={styles.headerRow}>
                {renderIcon() && <View style={styles.iconContainer}>{renderIcon()}</View>}
                <View style={styles.titleContainer}>
                  {title ? <Text style={styles.titleText}>{title}</Text> : null}
                </View>
              </View>

              {/* Message Body */}
              {message ? <Text style={styles.messageText}>{message}</Text> : null}

              {/* Custom Child Elements */}
              {children && <View style={styles.childrenWrapper}>{children}</View>}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                {cancelText ? (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onCancel}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>{cancelText}</Text>
                  </TouchableOpacity>
                ) : null}

                {confirmText ? (
                  <TouchableOpacity
                    style={[
                      styles.confirmBtn,
                      isDestructive ? styles.confirmBtnDestructive : styles.confirmBtnPrimary,
                    ]}
                    onPress={onConfirm}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator
                        size="small"
                        color={isDestructive ? "#FFFFFF" : "#000000"}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.confirmBtnText,
                          isDestructive
                            ? styles.confirmBtnTextDestructive
                            : styles.confirmBtnTextPrimary,
                        ]}
                      >
                        {confirmText}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/**
 * Root container to be mounted once in App.js for imperative confirm dialogs.
 */
export function ThemedDialogContainer() {
  const [dialogState, setDialogState] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dialogListener = (options) => {
      setDialogState(options);
      setLoading(false);
    };
    return () => {
      dialogListener = null;
    };
  }, []);

  if (!dialogState) return null;

  const handleConfirm = async () => {
    if (dialogState.onConfirm) {
      try {
        setLoading(true);
        await dialogState.onConfirm();
      } finally {
        setLoading(false);
        setDialogState(null);
      }
    } else {
      setDialogState(null);
    }
  };

  const handleCancel = () => {
    if (dialogState.onCancel) {
      dialogState.onCancel();
    }
    setDialogState(null);
  };

  return (
    <ThemedModal
      visible={Boolean(dialogState)}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      variant={dialogState.variant}
      iconType={dialogState.iconType}
      loading={loading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}

const screenWidth = RNDimensions.get("window").width;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: Math.min(screenWidth - 32, 420),
    backgroundColor: "#161616",
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    borderColor: "#282828",
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    lineHeight: 24,
  },
  messageText: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  childrenWrapper: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface.raised,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.secondary,
  },
  confirmBtn: {
    flex: 1.2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnPrimary: {
    backgroundColor: Colors.accent.amber,
  },
  confirmBtnDestructive: {
    backgroundColor: Colors.semantic.error,
  },
  confirmBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
  },
  confirmBtnTextPrimary: {
    color: "#000000",
  },
  confirmBtnTextDestructive: {
    color: "#FFFFFF",
  },
});

export default ThemedModal;

