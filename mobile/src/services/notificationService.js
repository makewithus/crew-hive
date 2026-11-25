/**
 * apps/mobile/src/services/notificationService.js
 * Native push notifications registration and incoming request dispatch listener.
 */

import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { api } from "./api.js";

const PUSH_TOKEN_KEY = "crewhive_expo_push_token";

// Detect if running inside Expo Go client (SDK 53+ removed remote push notifications in Expo Go)
const isExpoGo =
  (typeof isRunningInExpoGo === "function" && isRunningInExpoGo()) ||
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Foreground notification presentation policy (wrapped safely)
try {
  if (!isExpoGo) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (_) {}

class MobileNotificationService {
  cachedPushToken = null;
  navigationRef = null;

  setNavigationRef(ref) {
    this.navigationRef = ref;
  }

  /**
   * Requests push notification permissions, registers Android notification channel,
   * obtains the Expo push token, and registers it with the shared Express API.
   * In Expo Go (SDK 53+), remote push notifications were removed on Android; gracefully skips.
   */
  async registerForPushNotifications() {
    try {
      if (isExpoGo) {
        // Expo Go does not support remote push notifications in SDK 53+.
        // Use a development build (npx expo run:android) for native remote notifications.
        return null;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("urgent_requests", {
          name: "Urgent Availability Requests",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#F5A623",
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        return null;
      }

      // Obtain Expo push token
      const tokenResult = await Notifications.getExpoPushTokenAsync().catch(() => null);
      const pushToken = tokenResult?.data;

      if (pushToken) {
        this.cachedPushToken = pushToken;
        await SecureStore.setItemAsync(PUSH_TOKEN_KEY, pushToken).catch(() => {});

        // Register token with Express backend
        await api.post("/devices", {
          deviceToken: pushToken,
          platform: Platform.OS,
        }).catch(() => {});

        return pushToken;
      }
      return null;
    } catch (err) {
      // In simulator, emulators without Google Play Services, or offline, fail gracefully
      return null;
    }
  }

  /**
   * Unregisters device token on backend and clears local storage on logout.
   */
  async unregisterDevice() {
    try {
      const token = this.cachedPushToken || (await SecureStore.getItemAsync(PUSH_TOKEN_KEY).catch(() => null));
      if (token) {
        await api.delete("/devices", { body: { deviceToken: token } }).catch(() => {});
        await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY).catch(() => {});
      }
      this.cachedPushToken = null;
    } catch {}
  }

  /**
   * Sets up notification listeners for background tap and foreground delivery.
   */
  setupListeners(onNotificationTap) {
    if (isExpoGo) {
      return () => {};
    }
    try {
      const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response?.notification?.request?.content?.data;
        if (onNotificationTap) {
          onNotificationTap(data);
        } else if (this.navigationRef) {
          if (data?.bookingId || data?.requestId) {
            this.navigationRef.navigate("IncomingRequests", { highlightId: data.bookingId || data.requestId });
          }
        }
      });

      const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
        // Notification received in foreground
      });

      return () => {
        responseSubscription?.remove?.();
        receivedSubscription?.remove?.();
      };
    } catch (_) {
      return () => {};
    }
  }
}

export const notificationService = new MobileNotificationService();
export default notificationService;

