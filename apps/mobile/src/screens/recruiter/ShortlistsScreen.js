/**
 * apps/mobile/src/screens/recruiter/ShortlistsScreen.js
 * Recruiter shortlists and event-based "Crew for This Show" rosters (F6)
 * with FeatureAccess gating & WhatsApp request access action (F3).
 */

import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Modal,
  ScrollView,
} from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Badge from "../../components/common/Badge.js";
import Button from "../../components/common/Button.js";
import Input from "../../components/common/Input.js";
import EmptyState from "../../components/common/EmptyState.js";
import { toast } from "../../components/common/Toast.js";
import { confirmModal } from "../../components/common/ThemedModal.js";
import {
  ConsoleFaderIcon,
  TrashIcon,
  PlusIcon,
  MapPinIcon,
  BriefcaseIcon,
  PhoneIcon,
} from "../../components/common/AvIcons.js";
import { recruiterService } from "../../services/recruiterService.js";
import { api } from "../../services/api.js";
import { PARENT_ROLES } from "@crew-hive/shared";

export function ShortlistsScreen({ navigation, language = "en", onToggleLanguage, t }) {
  const [activeTab, setActiveTab] = useState("shows"); // "shows" | "saved"
  const [shortlists, setShortlists] = useState([]);
  const [shows, setShows] = useState([]);
  const [featureAllowed, setFeatureAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New Show Modal state
  const [showModalVisible, setShowModalVisible] = useState(false);
  const [showTitle, setShowTitle] = useState("");
  const [showDate, setShowDate] = useState("");
  const [showLocation, setShowLocation] = useState("");
  const [showRoles, setShowRoles] = useState([]);
  const [creatingShow, setCreatingShow] = useState(false);

  const isMl = language === "ml";

  const loadData = async () => {
    try {
      // 1. Check feature access
      const access = await api.get("/features").catch(() => null);
      if (access?.access?.shortlists && access.access.shortlists.allowed === false) {
        setFeatureAllowed(false);
      }

      const [lists, showsRes] = await Promise.all([
        recruiterService.getShortlists().catch(() => []),
        recruiterService.getShows().catch(() => ({ items: [] })),
      ]);
      setShortlists(lists || []);
      setShows(showsRes?.items || []);
    } catch (err) {
      // offline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRequestAccess = () => {
    const text = encodeURIComponent(
      "Hi CrewHive Support, I am an event organizer on CrewHive and would like to request access to Pro Shortlists and Show Rosters."
    );
    Linking.openURL(`https://wa.me/919000000001?text=${text}`).catch(() => {
      toast.info(
        isMl ? "വാട്സ്ആപ്പ് സപ്പോർട്ടുമായി ബന്ധപ്പെടുക: +91 90000 00001" : "Contact support at +91 90000 00001",
        isMl ? "സഹായ ഡെസ്ക്" : "CrewHive Support"
      );
    });
  };

  const handleCreateShow = async () => {
    if (!showTitle.trim()) {
      toast.warning(
        isMl ? "ഷോയുടെ പേര് നൽകുക." : "Please enter a show title.",
        isMl ? "വിവരം വേണം" : "Required"
      );
      return;
    }
    setCreatingShow(true);
    try {
      await recruiterService.saveShow({
        title: showTitle.trim(),
        date: showDate.trim() || undefined,
        location: showLocation.trim() || undefined,
        roles: showRoles.length ? showRoles : ["Sound", "Lighting"],
      });
      setShowModalVisible(false);
      setShowTitle("");
      setShowDate("");
      setShowLocation("");
      setShowRoles([]);
      toast.success(
        isMl ? "ഷോ റോസ്റ്റർ വിജയകരമായി ചേർത്തു." : "Show roster created successfully.",
        isMl ? "വിജയിച്ചു" : "Show Created"
      );
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to create show roster", isMl ? "പിശക്" : "Error");
    } finally {
      setCreatingShow(false);
    }
  };

  const handleDeleteShow = (id) => {
    confirmModal({
      title: isMl ? "ഷോ റദ്ദാക്കണോ?" : "Delete Show Roster?",
      message: isMl ? "ഈ ഇവന്റ് റോസ്റ്റർ നീക്കം ചെയ്യണമെന്ന് ഉറപ്പാണോ?" : "Are you sure you want to remove this show roster?",
      confirmText: isMl ? "ഡിലീറ്റ്" : "Delete Roster",
      cancelText: isMl ? "റദ്ദാക്കുക" : "Cancel",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await recruiterService.deleteShow(id);
          toast.success(
            isMl ? "ഷോ റോസ്റ്റർ നീക്കം ചെയ്തു." : "Show roster deleted successfully.",
            isMl ? "ഡിലീറ്റ് ചെയ്തു" : "Deleted"
          );
          loadData();
        } catch (err) {
          toast.error(err.message || "Failed to delete show", isMl ? "പിശക്" : "Error");
        }
      },
    });
  };

  const renderSavedItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.listTitle}>{item.name || (isMl ? "സാങ്കേതിക വിദഗ്ദ്ധൻ" : "Technician")}</Text>
        <Badge
          label={String(item.primaryRole || "CREW").toUpperCase().slice(0, 14)}
          variant="amber"
          size="sm"
        />
      </View>
      <Text style={styles.metaText}>
        {item.city || (isMl ? "കേരളം" : "Kerala")} · {isMl ? "സേവ് ചെയ്തത്: " : "saved "}
        {item.savedAt ? new Date(item.savedAt).toLocaleDateString() : (isMl ? "അടുത്തിടെ" : "recently")}
      </Text>
      <View style={styles.cardActions}>
        <Button
          title={isMl ? "പ്രൊഫൈൽ കാണുക" : "View Profile"}
          variant="outline"
          size="sm"
          onPress={() => navigation.navigate("CrewDetail", { crewId: item.id, crew: item })}
        />
        <TouchableOpacity
          onPress={async () => {
            await recruiterService.removeFromShortlist(item.id);
            loadData();
          }}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <TrashIcon size={16} color={Colors.semantic.error} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderShowItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.listTitle}>{item.title}</Text>
          <View style={styles.showMetaRow}>
            {item.location ? (
              <View style={styles.metaWithIcon}>
                <MapPinIcon size={12} color={Colors.text.muted} />
                <Text style={styles.metaText}>{item.location}</Text>
              </View>
            ) : null}
            {item.date ? (
              <Text style={styles.metaText}>• {item.date}</Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteShow(item.id)}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <TrashIcon size={16} color={Colors.text.muted} />
        </TouchableOpacity>
      </View>

      {/* Roles Grouped Under This Show */}
      <View style={styles.rolesSection}>
        <Text style={styles.rolesHeading}>
          {isMl ? "റോൾ വിന്യാസം (Roles for Show):" : "Roles Grouped for Show:"}
        </Text>
        <View style={styles.roleBadges}>
          {(item.roles || []).map((r, idx) => (
            <Badge key={idx} label={r} variant="neutral" size="sm" />
          ))}
        </View>
      </View>

      <View style={styles.cardActions}>
        <Button
          title={isMl ? "ഈ ഷോയ്ക്ക് ആളെ തിരയുക" : "Search Crew for This Show"}
          variant="primary"
          size="sm"
          onPress={() => navigation.navigate("CrewSearch", { city: item.location })}
        />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t ? t("recruiter.shortlists", "Saved Shortlists") : "Saved Shortlists"}
        subtitle={isMl ? "ഇവന്റ് റോസ്റ്ററുകളും സേവ് ചെയ്ത ക്രൂവും" : "Event Rosters & Saved Crew"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "shows" && styles.activeTabItem]}
          onPress={() => setActiveTab("shows")}
        >
          <Text style={[styles.tabText, activeTab === "shows" && styles.activeTabText]}>
            {isMl ? "ഷോ റോസ്റ്ററുകൾ (Show Roster)" : "Crew for This Show"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "saved" && styles.activeTabItem]}
          onPress={() => setActiveTab("saved")}
        >
          <Text style={[styles.tabText, activeTab === "saved" && styles.activeTabText]}>
            {isMl ? "സേവ് ചെയ്ത ക്രൂ (Saved)" : "Saved Crew"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {!featureAllowed ? (
          /* F3: Gated Feature Explanation & Request Access Action */
          <Card style={styles.gatedCard}>
            <View style={styles.gatedIconCircle}>
              <BriefcaseIcon size={32} color={Colors.accent.amber} />
            </View>
            <Text style={styles.gatedTitle}>
              {isMl ? "പ്രോ ഫീച്ചർ: ഷോ റോസ്റ്ററുകൾ" : "Crew for This Show (Pro Feature)"}
            </Text>
            <Text style={styles.gatedDesc}>
              {isMl
                ? "നിങ്ങളുടെ ഓരോ ഇവന്റിനും ആവശ്യമായ സൗണ്ട്, ലൈറ്റിംഗ്, ക്യാമറ ടെക്നീഷ്യന്മാരെ ഒരൊറ്റ റോസ്റ്ററിൽ ഗ്രൂപ്പ് ചെയ്ത് ബുക്കിംഗ് നടത്താം. അൺലിമിറ്റഡ് ഷോർട്ട് ലിസ്റ്റുകൾ സൂക്ഷിക്കാം."
                : "Organize complete event crew rosters by sound, lighting, and stage crafts. Group multiple roles under specific shows and dispatch batch requests."}
            </Text>
            <Button
              title={isMl ? "വാട്സ്ആപ്പിൽ ആക്സസ് അഭ്യർത്ഥിക്കുക" : "Request Access via WhatsApp"}
              variant="primary"
              size="md"
              onPress={handleRequestAccess}
              style={{ marginTop: 16 }}
            />
          </Card>
        ) : activeTab === "shows" ? (
          <>
            <View style={styles.createShowBar}>
              <Text style={styles.sectionTitle}>
                {isMl ? "നിങ്ങളുടെ ഇവന്റ് റോസ്റ്ററുകൾ" : "Event Crew Rosters"}
              </Text>
              <TouchableOpacity
                style={styles.newShowBtn}
                onPress={() => setShowModalVisible(true)}
              >
                <PlusIcon size={14} color="#000000" />
                <Text style={styles.newShowBtnText}>{isMl ? "പുതിയ ഷോ" : "New Show"}</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={shows}
              keyExtractor={(item) => item.id || String(Math.random())}
              renderItem={renderShowItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.accent.amber} />
              }
              ListEmptyComponent={
                !loading && (
                  <EmptyState
                    title={isMl ? "ഷോ റോസ്റ്ററുകൾ ഒന്നും ഇല്ല" : "No Shows Created Yet"}
                    description={
                      isMl
                        ? "ഒരു പുതിയ ഇവന്റ് റോസ്റ്റർ ഉണ്ടാക്കി വിവിധ വിഭാഗങ്ങളിലെ ടെക്നീഷ്യന്മാരെ ഒന്നിച്ചു ചേർക്കൂ."
                        : "Create a show roster to group lighting, sound, and stage crew for an upcoming event."
                    }
                    actionLabel={isMl ? "പുതിയ ഷോ റോസ്റ്റർ ഉണ്ടാക്കുക" : "Create Show Roster"}
                    onAction={() => setShowModalVisible(true)}
                  />
                )
              }
            />
          </>
        ) : (
          <FlatList
            data={shortlists}
            keyExtractor={(item) => item.id || String(Math.random())}
            renderItem={renderSavedItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.accent.amber} />
            }
            ListEmptyComponent={
              !loading && (
                <EmptyState
                  title={isMl ? "ഷോർട്ട് ലിസ്റ്റുകൾ ഇല്ല" : "No Saved Shortlists"}
                  description={
                    isMl
                      ? "ടെക്നീഷ്യന്മാരെ ബ്രൗസ് ചെയ്യുമ്പോൾ 'Save to Shortlist' വഴി ഇവിടെ ചേർക്കാം."
                      : "When browsing technicians, tap 'Save to Shortlist' to bookmark them here."
                  }
                  actionLabel={isMl ? "ക്രൂവിനെ തിരയുക" : "Search Crew"}
                  onAction={() => navigation.navigate("CrewSearch")}
                />
              )
            }
          />
        )}
      </View>

      {/* Create Show Modal */}
      <Modal
        visible={showModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isMl ? "പുതിയ ഇവന്റ് ഷോ റോസ്റ്റർ" : "New Show Roster"}</Text>
              <TouchableOpacity onPress={() => setShowModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label={isMl ? "ഷോ / ഇവന്റ് പേര് *" : "Show / Event Title *"}
                placeholder="e.g. Kochi Music Festival 2026"
                value={showTitle}
                onChangeText={setShowTitle}
              />
              <Input
                label={isMl ? "തീയതി (YYYY-MM-DD)" : "Date (YYYY-MM-DD)"}
                placeholder="e.g. 2026-12-24"
                value={showDate}
                onChangeText={setShowDate}
              />
              <Input
                label={isMl ? "ലൊക്കേഷൻ / വേദി" : "Location / Venue"}
                placeholder="e.g. Kochi Bolgatty Palace"
                value={showLocation}
                onChangeText={setShowLocation}
              />

              <Text style={styles.rolesHeading}>
                {isMl ? "ആവശ്യമായ വിഭാഗങ്ങൾ തിരഞ്ഞെടുക്കുക:" : "Select Roles Needed for Show:"}
              </Text>
              <View style={styles.chipGrid}>
                {PARENT_ROLES.map((r) => {
                  const roleName = r.nameEn || r.name;
                  const isSel = showRoles.includes(roleName);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.roleChip, isSel && styles.activeRoleChip]}
                      onPress={() => {
                        setShowRoles((prev) =>
                          prev.includes(roleName) ? prev.filter((x) => x !== roleName) : [...prev, roleName]
                        );
                      }}
                    >
                      <Text style={[styles.roleChipText, isSel && styles.activeRoleChipText]}>
                        {isMl ? (r.nameMl || roleName) : roleName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <Button
                  title={isMl ? "റദ്ദാക്കുക" : "Cancel"}
                  variant="outline"
                  size="md"
                  onPress={() => setShowModalVisible(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={isMl ? "റോസ്റ്റർ ഉണ്ടാക്കുക" : "Create Roster"}
                  variant="primary"
                  size="md"
                  loading={creatingShow}
                  onPress={handleCreateShow}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg.base,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
    backgroundColor: Colors.bg.surface,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabItem: {
    borderBottomColor: Colors.accent.amber,
  },
  tabText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.muted,
  },
  activeTabText: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.bold,
  },
  content: {
    flex: 1,
  },
  createShowBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Dimensions.screenPadding,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  newShowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.accent.amber,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  newShowBtnText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: "#000000",
  },
  listContent: {
    padding: Dimensions.screenPadding,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: Radius.xl,
    backgroundColor: Colors.bg.surface,
    borderWidth: 1,
    borderColor: Colors.border.base,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  listTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  showMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  metaWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  rolesSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  rolesHeading: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semiBold,
    color: Colors.accent.amber,
    marginBottom: 6,
  },
  roleBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  deleteBtn: {
    padding: 6,
  },
  gatedCard: {
    margin: Dimensions.screenPadding,
    padding: 24,
    alignItems: "center",
    backgroundColor: Colors.bg.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border.base,
  },
  gatedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(245, 166, 35, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  gatedTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  gatedDesc: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: Colors.bg.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Dimensions.screenPadding,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  modalTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  modalCloseText: {
    fontSize: Typography.size.lg,
    color: Colors.text.muted,
    padding: 4,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.raised,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  activeRoleChip: {
    borderColor: Colors.accent.amber,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
  },
  roleChipText: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
  },
  activeRoleChipText: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.bold,
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 20,
  },
});

export default ShortlistsScreen;
