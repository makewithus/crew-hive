/**
 * apps/mobile/src/components/common/Toast.js
 * Theme-matching, responsive global Toast notification system.
 * Replaces unstyled native alert dialogs with sleek, animated top-right dark toasts.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions as RNDimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle, Rect, Line } from "react-native-svg";
import { Colors, Radius, Typography } from "../../constants/theme.js";

// Toast event emitter listener
let toastListener = null;

/**
 * Trigger a toast notification from anywhere in the mobile app.
 * @param {Object} options
 * @param {'success' | 'error' | 'warning' | 'info'} [options.type='success']
 * @param {string} [options.title]
 * @param {string} options.message
 * @param {number} [options.duration=3500]
 */
export function showToast({ type = "success", title, message, duration = 3500 }) {
  if (toastListener) {
    toastListener({ type, title, message, duration, id: Date.now() });
  }
}

showToast.success = (message, title) => showToast({ type: "success", title, message });
showToast.error = (message, title) => showToast({ type: "error", title, message });
showToast.warning = (message, title) => showToast({ type: "warning", title, message });
showToast.info = (message, title) => showToast({ type: "info", title, message });

export const toast = showToast;

function SuccessIcon({ size = 20, color = "#10B981" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Path d="M8 12L11 15L16 9" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ErrorIcon({ size = 20, color = "#EF4444" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Line x1="15" y1="9" x2="9" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="9" y1="9" x2="15" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function WarningIcon({ size = 20, color = "#F5A623" }) {
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

function InfoIcon({ size = 20, color = "#3B82F6" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Line x1="12" y1="16" x2="12" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="8" r="1" fill={color} />
    </Svg>
  );
}

function CloseIcon({ size = 16, color = "#888888" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Mount this component once at the application root (e.g. inside App.js).
 */
export function ToastContainer() {
  const insets = useSafeAreaInsets();
  const [currentToast, setCurrentToast] = useState(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef(null);

  useEffect(() => {
    toastListener = (data) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);

      setCurrentToast(data);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      hideTimer.current = setTimeout(() => {
        dismissToast();
      }, data.duration || 3500);
    };

    return () => {
      toastListener = null;
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const dismissToast = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentToast(null);
    });
  };

  if (!currentToast) return null;

  const { type, title, message } = currentToast;

  const getBorderColor = () => {
    switch (type) {
      case "success":
        return "#10B981";
      case "error":
        return "#EF4444";
      case "warning":
        return "#F5A623";
      case "info":
      default:
        return "#3B82F6";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <SuccessIcon size={20} color="#10B981" />;
      case "error":
        return <ErrorIcon size={20} color="#EF4444" />;
      case "warning":
        return <WarningIcon size={20} color="#F5A623" />;
      case "info":
      default:
        return <InfoIcon size={20} color="#3B82F6" />;
    }
  };

  const defaultTitle = () => {
    switch (type) {
      case "success":
        return "Success";
      case "error":
        return "Error";
      case "warning":
        return "Notice";
      case "info":
      default:
        return "Information";
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: Math.max(insets.top, 16) + 6,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[
          styles.toastCard,
          { borderLeftColor: getBorderColor(), borderLeftWidth: 4 },
        ]}
        onPress={dismissToast}
        activeOpacity={0.9}
      >
        <View style={styles.iconWrapper}>{getIcon()}</View>

        <View style={styles.textWrapper}>
          <Text style={styles.titleText}>{title || defaultTitle()}</Text>
          {message ? <Text style={styles.messageText}>{message}</Text> : null}
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismissToast}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <CloseIcon size={14} color="#888888" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: "flex-end", // Align top-right on wide devices
  },
  toastCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#161616",
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "#282828",
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 16,
  },
  iconWrapper: {
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrapper: {
    flex: 1,
    paddingRight: 8,
  },
  titleText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    lineHeight: 18,
  },
  messageText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    marginTop: 3,
    lineHeight: 17,
  },
  closeButton: {
    padding: 4,
    marginLeft: 6,
    alignSelf: "flex-start",
  },
});

