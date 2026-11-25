/**
 * apps/mobile/src/navigation/RootNavigator.js
 * Master router coordinating Auth Stack, Crew Workspace, and Recruiter Workspace.
 */

import React, { useState, useMemo, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import * as Linking from "expo-linking";
import { Colors } from "../constants/theme.js";
import BottomTabBar from "./BottomTabBar.js";
import { notificationService } from "../services/notificationService.js";
import { setNotificationHandler } from "../services/authService.js";

// Register push notification hooks with authService
setNotificationHandler({
  register: () => notificationService.registerForPushNotifications(),
  unregister: () => notificationService.unregisterDevice(),
});

// Shared Screens
import WelcomeScreen from "../screens/shared/WelcomeScreen.js";
import PhoneAuthScreen from "../screens/shared/PhoneAuthScreen.js";
import OtpVerificationScreen from "../screens/shared/OtpVerificationScreen.js";
import ConsentScreen from "../screens/shared/ConsentScreen.js";
import OnboardingSuccessScreen from "../screens/shared/OnboardingSuccessScreen.js";
import NotificationsScreen from "../screens/shared/NotificationsScreen.js";
import SettingsScreen from "../screens/shared/SettingsScreen.js";
import AccountDeletionScreen from "../screens/shared/AccountDeletionScreen.js";
import HelpSupportScreen from "../screens/shared/HelpSupportScreen.js";
import TermsPrivacyScreen from "../screens/shared/TermsPrivacyScreen.js";
import AppTourScreen from "../screens/shared/AppTourScreen.js";

// Crew Screens
import RoleSelectionScreen from "../screens/crew/RoleSelectionScreen.js";
import CitySelectionScreen from "../screens/crew/CitySelectionScreen.js";
import CrewDashboardScreen from "../screens/crew/CrewDashboardScreen.js";
import CrewProfileScreen from "../screens/crew/CrewProfileScreen.js";
import EditProfileScreen from "../screens/crew/EditProfileScreen.js";
import AvailabilityScreen from "../screens/crew/AvailabilityScreen.js";
import IncomingRequestsScreen from "../screens/crew/IncomingRequestsScreen.js";
import RequestHistoryScreen from "../screens/crew/RequestHistoryScreen.js";

// Recruiter Screens
import RecruiterOnboardingScreen from "../screens/recruiter/RecruiterOnboardingScreen.js";
import RecruiterDashboardScreen from "../screens/recruiter/RecruiterDashboardScreen.js";
import CrewSearchScreen from "../screens/recruiter/CrewSearchScreen.js";
import CrewDetailScreen from "../screens/recruiter/CrewDetailScreen.js";
import CreateRequestScreen from "../screens/recruiter/CreateRequestScreen.js";
import RequestsSentScreen from "../screens/recruiter/RequestsSentScreen.js";
import ShortlistsScreen from "../screens/recruiter/ShortlistsScreen.js";

const screenRegistry = {
  // Shared
  Welcome: WelcomeScreen,
  PhoneAuth: PhoneAuthScreen,
  OtpVerification: OtpVerificationScreen,
  Consent: ConsentScreen,
  OnboardingSuccess: OnboardingSuccessScreen,
  Notifications: NotificationsScreen,
  Settings: SettingsScreen,
  AccountDeletion: AccountDeletionScreen,
  HelpSupport: HelpSupportScreen,
  TermsPrivacy: TermsPrivacyScreen,
  AppTour: AppTourScreen,

  // Crew
  RoleSelection: RoleSelectionScreen,
  CitySelection: CitySelectionScreen,
  CrewDashboard: CrewDashboardScreen,
  CrewProfile: CrewProfileScreen,
  EditProfile: EditProfileScreen,
  AvailabilityModal: AvailabilityScreen,
  IncomingRequests: IncomingRequestsScreen,
  RequestHistory: RequestHistoryScreen,

  // Recruiter
  RecruiterOnboarding: RecruiterOnboardingScreen,
  RecruiterDashboard: RecruiterDashboardScreen,
  CrewSearch: CrewSearchScreen,
  CrewDetail: CrewDetailScreen,
  CreateRequest: CreateRequestScreen,
  RequestsSent: RequestsSentScreen,
  Shortlists: ShortlistsScreen,
};

const CREW_TABS = ["CrewDashboard", "IncomingRequests", "AvailabilityModal", "CrewProfile"];
const RECRUITER_TABS = ["RecruiterDashboard", "CrewSearch", "RequestsSent", "Settings"];

export function RootNavigator({
  initialUser,
  language,
  onToggleLanguage,
  t,
  onLogout,
}) {
  const [currentUser, setCurrentUser] = useState(initialUser);

  // Determine initial screen based on user role
  const defaultScreen = useMemo(() => {
    if (!currentUser) return "Welcome";
    if (currentUser.role === "recruiter") return "RecruiterDashboard";
    return "CrewDashboard";
  }, [currentUser]);

  const [history, setHistory] = useState([{ name: defaultScreen, params: {} }]);

  const activeEntry = history[history.length - 1] || { name: defaultScreen, params: {} };
  const currentScreenName = activeEntry.name;
  const currentParams = activeEntry.params;

  const navigation = useMemo(
    () => ({
      navigate: (screenName, params = {}) => {
        setHistory((prev) => [...prev, { name: screenName, params }]);
      },
      goBack: () => {
        setHistory((prev) => (prev.length > 1 ? prev.slice(0, prev.length - 1) : prev));
      },
      reset: ({ routes }) => {
        if (routes && routes.length > 0) {
          setHistory(routes);
        }
      },
    }),
    []
  );

  // Setup push notification tap response and deep links
  useEffect(() => {
    notificationService.setNavigationRef(navigation);
    const unsubNotifications = notificationService.setupListeners((data) => {
      if (data?.bookingId || data?.requestId) {
        navigation.navigate("IncomingRequests", { highlightId: data.bookingId || data.requestId });
      }
    });

    const handleDeepLink = (url) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        const path = parsed.path || "";
        if (path.includes("crew/")) {
          const segments = path.split("crew/")[1]?.split("/");
          const id = segments ? segments[0]?.replace(/\D/g, "") : null;
          if (id) {
            navigation.navigate("CrewDetail", { crew: { id } });
          }
        }
      } catch (_) {}
    };

    Linking.getInitialURL().then(handleDeepLink).catch(() => {});
    const linkingSub = Linking.addEventListener("url", (e) => handleDeepLink(e.url));

    return () => {
      if (unsubNotifications) unsubNotifications();
      if (linkingSub?.remove) linkingSub.remove();
    };
  }, [navigation]);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === "recruiter") {
      navigation.reset({ routes: [{ name: "RecruiterDashboard" }] });
    } else {
      navigation.reset({ routes: [{ name: "CrewDashboard" }] });
    }
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    if (onLogout) onLogout();
    navigation.reset({ routes: [{ name: "Welcome" }] });
  };

  const ScreenComponent = screenRegistry[currentScreenName] || WelcomeScreen;

  // Decide whether to show bottom tab bar
  const isCrewTab = currentUser?.role !== "recruiter" && CREW_TABS.includes(currentScreenName);
  const isRecruiterTab = currentUser?.role === "recruiter" && RECRUITER_TABS.includes(currentScreenName);
  const showTabBar = isCrewTab || isRecruiterTab;

  return (
    <View style={styles.container}>
      <View style={styles.screenArea}>
        <ScreenComponent
          navigation={navigation}
          route={{ name: currentScreenName, params: currentParams }}
          currentUser={currentUser}
          language={language}
          onToggleLanguage={onToggleLanguage}
          onAuthSuccess={handleAuthSuccess}
          onLogout={handleUserLogout}
          t={t}
        />
      </View>

      {showTabBar && (
        <BottomTabBar
          activeTab={currentScreenName}
          onSelectTab={(tabName) => navigation.navigate(tabName)}
          role={currentUser?.role || "crew"}
          language={language}
          t={t}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.base,
  },
  screenArea: {
    flex: 1,
  },
});

export default RootNavigator;

