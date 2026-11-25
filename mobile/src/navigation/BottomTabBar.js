/**
 * apps/mobile/src/navigation/BottomTabBar.js
 * Surface bottom tab bar styled according to BRANDING.md (#141414 surface, #F5A623 active).
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Radius, Typography } from "../constants/theme.js";
import {
  ConsoleFaderIcon,
  SearchIcon,
  ClockIcon,
  SettingsIcon,
  BriefcaseIcon,
  BellIcon,
} from "../components/common/AvIcons.js";

export function BottomTabBar({ activeTab, onSelectTab, role, language = "en", t = null }) {
  const isRecruiter = role === "recruiter";
  const isMl = language === "ml";

  const crewTabs = [
    { key: "CrewDashboard", label: isMl ? "ഡെസ്ക്" : "Desk", icon: ConsoleFaderIcon },
    { key: "IncomingRequests", label: isMl ? "അന്വേഷണം" : "Inquiries", icon: ClockIcon },
    { key: "AvailabilityModal", label: isMl ? "18h ലഭ്യത" : "18h Status", icon: BellIcon },
    { key: "CrewProfile", label: isMl ? "പ്രൊഫൈൽ" : "Profile", icon: SettingsIcon },
  ];

  const recruiterTabs = [
    { key: "RecruiterDashboard", label: isMl ? "ഡെസ്ക്" : "Desk", icon: BriefcaseIcon },
    { key: "CrewSearch", label: isMl ? "ക്രൂ തിരയുക" : "Find Crew", icon: SearchIcon },
    { key: "RequestsSent", label: isMl ? "അയച്ചവ" : "Dispatched", icon: ClockIcon },
    { key: "Settings", label: isMl ? "സെറ്റിംഗ്സ്" : "Settings", icon: SettingsIcon },
  ];

  const tabs = isRecruiter ? recruiterTabs : crewTabs;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const IconComponent = tab.icon;

        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => onSelectTab(tab.key)}
            style={styles.tabItem}
          >
            <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
              <IconComponent
                size={22}
                color={isActive ? Colors.accent.amber : Colors.text.muted}
              />
            </View>
            <Text
              style={[styles.tabLabel, isActive && styles.activeTabLabel]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.surface.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
    paddingVertical: 8,
    paddingBottom: 20,
    justifyContent: "space-around",
    alignItems: "center",
    zIndex: 100,
    elevation: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  iconWrapper: {
    padding: 4,
    borderRadius: Radius.md,
  },
  activeIconWrapper: {
    backgroundColor: "rgba(245, 166, 35, 0.12)",
  },
  tabLabel: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: 4,
    fontWeight: Typography.weight.medium,
  },
  activeTabLabel: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.bold,
  },
});

export default BottomTabBar;

