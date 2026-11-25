/**
 * apps/mobile/App.js
 * Main entrypoint for CrewHive React Native Expo application.
 * Mounts SafeAreaProvider, global theme, offline monitor, bilingual dictionary, and RootNavigator.
 */

import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, ActivityIndicator, LogBox } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";

// Suppress non-breaking upstream library warnings in Expo Go
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated and will be removed in a future release",
  "`expo-notifications` functionality is not fully supported in Expo Go",
  "Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go",
]);

import { Colors } from "./src/constants/theme.js";
import OfflineBanner from "./src/components/common/OfflineBanner.js";
import { ToastContainer } from "./src/components/common/Toast.js";
import { ThemedDialogContainer } from "./src/components/common/ThemedModal.js";
import RootNavigator from "./src/navigation/RootNavigator.js";
import * as SecureStore from "expo-secure-store";
import { authService } from "./src/services/authService.js";
import { onSessionExpired } from "./src/services/api.js";

// Dictionaries
import enDictionary from "./src/localization/en.json";
import mlDictionary from "./src/localization/ml.json";

export default function App() {
  const [language, setLanguage] = useState("en");
  const [isOffline, setIsOffline] = useState(false);
  const [initialUser, setInitialUser] = useState(null);
  const [navKey, setNavKey] = useState(0); // remount navigator when the session dies
  const [bootstrapping, setBootstrapping] = useState(true);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsubscribe();
  }, []);

  // Check persisted session
  useEffect(() => {
    async function initSession() {
      try {
        const savedLang = await SecureStore.getItemAsync("crewhive_lang").catch(() => null);
        if (savedLang === "ml" || savedLang === "en") setLanguage(savedLang);
        const restored = await authService.restoreSession();
        if (restored) setInitialUser(restored);
      } catch (e) {
        // start unauthenticated
      } finally {
        setBootstrapping(false);
      }
    }
    initSession();
  }, []);

  // A refresh failure (revoked/expired/deleted account) sends the user back to Welcome.
  useEffect(() => onSessionExpired(() => { setInitialUser(null); setNavKey((k) => k + 1); }), []);

  // Language toggle (persisted)
  const handleToggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === "en" ? "ml" : "en";
      SecureStore.setItemAsync("crewhive_lang", next).catch(() => {});
      return next;
    });
  }, []);

  // Translation helper function
  const t = useCallback(
    (keyPath, fallback) => {
      const activeDict = language === "ml" ? mlDictionary : enDictionary;
      const parts = keyPath.split(".");
      let cur = activeDict;

      for (const part of parts) {
        if (cur && typeof cur === "object" && part in cur) {
          cur = cur[part];
        } else {
          cur = undefined;
          break;
        }
      }

      if (cur !== undefined && typeof cur !== "object") {
        return cur;
      }

      // Fallback to English dictionary
      if (language === "ml") {
        let fallbackCur = enDictionary;
        for (const part of parts) {
          if (fallbackCur && typeof fallbackCur === "object" && part in fallbackCur) {
            fallbackCur = fallbackCur[part];
          } else {
            fallbackCur = undefined;
            break;
          }
        }
        if (fallbackCur !== undefined && typeof fallbackCur !== "object") {
          return fallbackCur;
        }
      }

      return fallback || keyPath;
    },
    [language]
  );

  if (bootstrapping) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" backgroundColor={Colors.bg.base} />
        <ActivityIndicator size="large" color={Colors.accent.amber} />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={styles.provider}>
      <StatusBar style="light" backgroundColor={Colors.bg.base} />
      <OfflineBanner visible={isOffline} onRetry={() => NetInfo.fetch()} />
      <RootNavigator
        key={navKey}
        initialUser={initialUser}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        t={t}
        onLogout={() => setInitialUser(null)}
      />
      <ThemedDialogContainer />
      <ToastContainer />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  provider: {
    flex: 1,
    backgroundColor: Colors.bg.base,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.bg.base,
    alignItems: "center",
    justifyContent: "center",
  },
});
