/**
 * apps/mobile/src/screens/crew/EditProfileScreen.js
 * Progressive profile enhancement:
 * - Photo upload with ImagePicker (<5MB) (B1)
 * - Languages multi-select (B3)
 * - Structured past credits (B6)
 * - Equipment owned (B7)
 * - Day rates, visibility toggle, travel radius, bio
 */

import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Input from "../../components/common/Input.js";
import Button from "../../components/common/Button.js";
import Badge from "../../components/common/Badge.js";
import { toast } from "../../components/common/Toast.js";
import {
  CameraIcon,
  TrashIcon,
  PlusIcon,
  BriefcaseIcon,
  ConsoleFaderIcon,
} from "../../components/common/AvIcons.js";
import { crewService } from "../../services/crewService.js";

const EXPERIENCE_OPTIONS = [
  { id: "0-2 years", labelEn: "0-2 years", labelMl: "0-2 വർഷം" },
  { id: "2-5 years", labelEn: "2-5 years", labelMl: "2-5 വർഷം" },
  { id: "5-10 years", labelEn: "5-10 years", labelMl: "5-10 വർഷം" },
  { id: "10+ years", labelEn: "10+ years", labelMl: "10+ വർഷം" },
];

const TRAVEL_OPTIONS = [
  { id: "All Kerala", labelEn: "All Kerala", labelMl: "കേരളം മുഴുവൻ" },
  { id: "Kochi + 50km", labelEn: "Kochi Hub", labelMl: "കൊച്ചി ഹബ്ബ്" },
  { id: "Local District Only", labelEn: "Local District", labelMl: "സ്വന്തം ജില്ല" },
  { id: "South Kerala", labelEn: "South Kerala", labelMl: "തെക്കൻ കേരളം" },
  { id: "North Kerala", labelEn: "North Kerala", labelMl: "വടക്കൻ കേരളം" },
];

const LANGUAGE_OPTIONS = [
  { id: "Malayalam", labelEn: "Malayalam", labelMl: "മലയാളം" },
  { id: "English", labelEn: "English", labelMl: "English" },
  { id: "Tamil", labelEn: "Tamil", labelMl: "தமிழ்" },
  { id: "Hindi", labelEn: "Hindi", labelMl: "हिन्दी" },
  { id: "Kannada", labelEn: "Kannada", labelMl: "ಕನ್ನಡ" },
  { id: "Telugu", labelEn: "Telugu", labelMl: "తెలుగు" },
  { id: "Other", labelEn: "Other", labelMl: "മറ്റുള്ളവ" },
];

const EQUIPMENT_CATEGORIES = ["Audio", "Lighting", "Rigging", "Camera", "Video", "Other"];

export function EditProfileScreen({ navigation, route, language = "en", onToggleLanguage, t }) {
  const existing = route?.params?.profile || {};
  const isMl = language === "ml";

  const [name, setName] = useState(existing.name || "");
  const [bio, setBio] = useState(existing.bio || "");
  const [profileImage, setProfileImage] = useState(existing.profileImage || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [dayRate, setDayRate] = useState(existing.dayRate ? String(existing.dayRate) : "");
  const [showDayRate, setShowDayRate] = useState(existing.showDayRate ?? true);
  const [experience, setExperience] = useState(existing.experience || "2-5 years");
  const [travelRadius, setTravelRadius] = useState(existing.travelRadius || "All Kerala");
  const [portfolioUrl, setPortfolioUrl] = useState(existing.portfolioUrl || "");

  // B3: Languages multi-select
  const [languages, setLanguages] = useState(
    Array.isArray(existing.languages) && existing.languages.length ? existing.languages : ["Malayalam"]
  );

  // B6: Past credits
  const [pastCredits, setPastCredits] = useState(
    Array.isArray(existing.pastCredits) ? existing.pastCredits : []
  );
  const [showAddCredit, setShowAddCredit] = useState(false);
  const [newCreditEvent, setNewCreditEvent] = useState("");
  const [newCreditRole, setNewCreditRole] = useState("");
  const [newCreditYear, setNewCreditYear] = useState(String(new Date().getFullYear()));

  // B7: Equipment owned
  const [equipmentOwned, setEquipmentOwned] = useState(
    Array.isArray(existing.equipmentOwned) ? existing.equipmentOwned : []
  );
  const [showAddEquip, setShowAddEquip] = useState(false);
  const [newEquipName, setNewEquipName] = useState("");
  const [newEquipCategory, setNewEquipCategory] = useState("Audio");
  const [newEquipModel, setNewEquipModel] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toast.warning(
          isMl ? "ഫോട്ടോ മാറ്റാൻ ഗാലറി അനുമതി നൽകുക." : "Permission to access photo library is required.",
          isMl ? "അനുമതി വേണം" : "Permission Required"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        toast.warning(
          isMl ? "ചിത്രം 5MB ൽ താഴെ ആയിരിക്കണം." : "Image file size must be under 5MB.",
          isMl ? "വലിപ്പം കൂടുതൽ" : "File Too Large"
        );
        return;
      }

      setUploadingPhoto(true);
      const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "crewhive_default";

      if (cloudName && asset.uri) {
        const data = new FormData();
        data.append("file", { uri: asset.uri, type: "image/jpeg", name: "profile.jpg" });
        data.append("upload_preset", uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: data,
        });
        const json = await res.json();
        if (json.secure_url) {
          setProfileImage(json.secure_url);
        } else if (asset.base64) {
          setProfileImage(`data:image/jpeg;base64,${asset.base64}`);
        }
      } else if (asset.base64) {
        setProfileImage(`data:image/jpeg;base64,${asset.base64}`);
      } else if (asset.uri) {
        setProfileImage(asset.uri);
      }
    } catch (err) {
      toast.error(err.message || "Failed to select photo", isMl ? "പിശക്" : "Error");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleToggleLanguage = (langId) => {
    setLanguages((prev) =>
      prev.includes(langId) ? (prev.length > 1 ? prev.filter((l) => l !== langId) : prev) : [...prev, langId]
    );
  };

  const handleAddCredit = () => {
    if (!newCreditEvent.trim()) return;
    setPastCredits((prev) => [
      ...prev,
      {
        eventName: newCreditEvent.trim(),
        role: newCreditRole.trim() || existing.primaryRole || "Technician",
        year: newCreditYear.trim() || String(new Date().getFullYear()),
      },
    ]);
    setNewCreditEvent("");
    setNewCreditRole("");
    setNewCreditYear(String(new Date().getFullYear()));
    setShowAddCredit(false);
  };

  const handleRemoveCredit = (idx) => {
    setPastCredits((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddEquipment = () => {
    if (!newEquipName.trim()) return;
    setEquipmentOwned((prev) => [
      ...prev,
      {
        name: newEquipName.trim(),
        category: newEquipCategory,
        model: newEquipModel.trim(),
      },
    ]);
    setNewEquipName("");
    setNewEquipModel("");
    setShowAddEquip(false);
  };

  const handleRemoveEquipment = (idx) => {
    setEquipmentOwned((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t ? t("crew.enterName", "Please enter your name") : "Please enter your name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await crewService.updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        profileImage,
        dayRate: dayRate ? Number(dayRate) : null,
        showDayRate,
        experience,
        travelRadius,
        portfolioUrl: portfolioUrl.trim(),
        languages,
        pastCredits,
        equipmentOwned,
      });

      toast.success(
        t ? t("crew.profileUpdatedDesc", "Your changes have been saved successfully.") : "Your changes have been saved successfully.",
        t ? t("crew.profileUpdated", "Profile Updated") : "Profile Updated"
      );
      navigation.goBack();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || "Failed to update profile";
      setError(msg);
      toast.error(msg, t ? t("common.error", "Update Failed") : "Update Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t ? t("crew.editProfile", "Edit Profile") : "Edit Profile"}
        subtitle={t ? t("crew.editProfileSubtitle", "Commercials & Craft Details") : "Commercials & Craft Details"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Upload Section (B1) */}
        <Card style={styles.photoCard}>
          <View style={styles.photoRow}>
            <View style={styles.avatarWrapper}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <ConsoleFaderIcon size={32} color={Colors.accent.amber} />
                </View>
              )}
              {uploadingPhoto && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color={Colors.accent.amber} size="small" />
                </View>
              )}
            </View>

            <View style={styles.photoActions}>
              <Text style={styles.photoTitle}>
                {isMl ? "പ്രൊഫൈൽ ചിത്രം" : "Profile Photo"}
              </Text>
              <Text style={styles.photoSubtitle}>
                {isMl ? "ഓപ്ഷണൽ • പരമാവധി 5MB" : "Optional • Max 5MB JPG/PNG"}
              </Text>
              <View style={styles.photoBtnRow}>
                <TouchableOpacity
                  style={styles.changePhotoBtn}
                  onPress={handlePickPhoto}
                  disabled={uploadingPhoto}
                >
                  <CameraIcon size={14} color={Colors.text.primary} />
                  <Text style={styles.changePhotoText}>
                    {profileImage
                      ? (isMl ? "മാറ്റുക" : "Change")
                      : (isMl ? "ഫോട്ടോ നൽകുക" : "Upload")}
                  </Text>
                </TouchableOpacity>

                {profileImage && (
                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => setProfileImage(null)}
                    disabled={uploadingPhoto}
                  >
                    <TrashIcon size={14} color={Colors.semantic.error} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Basic Info */}
        <Input
          label={t ? t("crew.professionalName", "Professional Name") : "Professional Name"}
          placeholder={t ? t("crew.namePlaceholder", "e.g. Rahul Nair") : "e.g. Rahul Nair"}
          value={name}
          onChangeText={setName}
          error={error}
        />

        {/* Commercials Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            {t ? t("crew.commercialTerms", "Commercial Terms") : "Commercial Terms"}
          </Text>

          <Input
            label={t ? t("crew.dayRateLabel", "Standard Day Rate (₹ INR)") : "Standard Day Rate (₹ INR)"}
            placeholder={t ? t("crew.dayRatePlaceholder", "e.g. 3500") : "e.g. 3500"}
            value={dayRate}
            onChangeText={setDayRate}
            keyboardType="numeric"
            helperText={t ? t("crew.commissionNote", "CrewHive takes 0% commission. You keep 100% of your rate.") : "CrewHive takes 0% commission. You keep 100% of your rate."}
          />

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.switchLabel}>
                {t ? t("crew.displayRatePublicly", "Display rate publicly") : "Display rate publicly"}
              </Text>
              <Text style={styles.switchSubtext}>
                {t ? t("crew.displayRateSubtext", "When disabled, recruiters see \"Rate on request\"") : "When disabled, recruiters see \"Rate on request\""}
              </Text>
            </View>
            <Switch
              value={showDayRate}
              onValueChange={setShowDayRate}
              trackColor={{ false: Colors.surface.raised, true: Colors.accent.amber }}
              thumbColor={Colors.text.primary}
            />
          </View>
        </Card>

        {/* B3: Languages Multi-Select */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            {isMl ? "സംസാരിക്കുന്ന ഭാഷകൾ" : "Languages Known"}
          </Text>
          <Text style={styles.fieldSubtitle}>
            {isMl ? "റിക്രൂട്ടർമാർക്ക് എളുപ്പത്തിൽ ആശയവിനിമയം നടത്താൻ" : "Select all languages you are comfortable working in"}
          </Text>

          <View style={styles.chipRow}>
            {LANGUAGE_OPTIONS.map((lang) => {
              const isSelected = languages.includes(lang.id);
              return (
                <TouchableOpacity
                  key={lang.id}
                  activeOpacity={0.75}
                  onPress={() => handleToggleLanguage(lang.id)}
                  style={[styles.chip, isSelected && styles.activeChip]}
                >
                  <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
                    {isMl ? lang.labelMl : lang.labelEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Logistics & Experience */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            {t ? t("crew.experienceMobility", "Experience & Mobility") : "Experience & Mobility"}
          </Text>

          <Text style={styles.fieldLabel}>
            {t ? t("crew.yearsExperience", "Years of Experience") : "Years of Experience"}
          </Text>
          <View style={styles.chipRow}>
            {EXPERIENCE_OPTIONS.map((opt) => {
              const isSelected = experience === opt.id || experience === opt.labelEn || experience === opt.labelMl;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.75}
                  onPress={() => setExperience(opt.id)}
                  style={[styles.chip, isSelected && styles.activeChip]}
                >
                  <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
                    {isMl ? opt.labelMl : opt.labelEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
            {t ? t("crew.travelRadius", "Travel Radius / Willingness") : "Travel Radius / Willingness"}
          </Text>
          <View style={styles.chipRow}>
            {TRAVEL_OPTIONS.map((opt) => {
              const isSelected = travelRadius === opt.id || travelRadius === opt.labelEn || travelRadius === opt.labelMl;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.75}
                  onPress={() => setTravelRadius(opt.id)}
                  style={[styles.chip, isSelected && styles.activeChip]}
                >
                  <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
                    {isMl ? opt.labelMl : opt.labelEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* B6: Structured Past Credits & Shows */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>
                {isMl ? "കഴിഞ്ഞ വർക്കുകൾ & ഷോകൾ" : "Past Credits & Productions"}
              </Text>
              <Text style={styles.fieldSubtitle}>
                {isMl ? "നിങ്ങൾ പ്രവർത്തിച്ച പ്രധാന പ്രൊഡക്ഷനുകൾ" : "Notable shows, concerts, films, or corporate events"}
              </Text>
            </View>
            {!showAddCredit && (
              <TouchableOpacity
                style={styles.addItemBtn}
                onPress={() => setShowAddCredit(true)}
              >
                <PlusIcon size={14} color={Colors.accent.amber} />
                <Text style={styles.addItemBtnText}>{isMl ? "ചേർക്കുക" : "Add"}</Text>
              </TouchableOpacity>
            )}
          </View>

          {showAddCredit && (
            <View style={styles.addFormContainer}>
              <Input
                label={isMl ? "ഇവന്റ് / പ്രൊഡക്ഷൻ പേര്" : "Event / Production Name"}
                placeholder="e.g. Kochi Music Festival 2026"
                value={newCreditEvent}
                onChangeText={setNewCreditEvent}
              />
              <View style={styles.twoColInputs}>
                <View style={{ flex: 2, marginRight: 8 }}>
                  <Input
                    label={isMl ? "റോൾ" : "Role on Set"}
                    placeholder="e.g. FOH Engineer"
                    value={newCreditRole}
                    onChangeText={setNewCreditRole}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label={isMl ? "വർഷം" : "Year"}
                    placeholder="2026"
                    value={newCreditYear}
                    onChangeText={setNewCreditYear}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.addFormActions}>
                <Button
                  title={isMl ? "റദ്ദാക്കുക" : "Cancel"}
                  variant="outline"
                  size="sm"
                  onPress={() => setShowAddCredit(false)}
                />
                <Button
                  title={isMl ? "സേവ് ചെയ്യുക" : "Save Credit"}
                  variant="primary"
                  size="sm"
                  onPress={handleAddCredit}
                />
              </View>
            </View>
          )}

          {pastCredits.length === 0 && !showAddCredit ? (
            <Text style={styles.emptyNote}>
              {isMl
                ? "വർക്കുകൾ ഒന്നും ചേർത്തിട്ടില്ല. റിക്രൂട്ടർമാരുടെ ശ്രദ്ധ ആകർഷിക്കാൻ ചേർക്കുക."
                : "No past credits added yet. Adding shows boosts your recruiter credibility."}
            </Text>
          ) : (
            pastCredits.map((item, idx) => (
              <View key={idx} style={styles.creditItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creditItemName}>{item.eventName}</Text>
                  <Text style={styles.creditItemMeta}>
                    {item.role || "Crew"} • {item.year || "Recent"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveCredit(idx)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <TrashIcon size={16} color={Colors.text.muted} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>

        {/* B7: Equipment Owned */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>
                {isMl ? "സ്വന്തം ഉപകരണങ്ങൾ" : "Equipment Owned"}
              </Text>
              <Text style={styles.fieldSubtitle}>
                {isMl ? "നിങ്ങളുടെ കൈവശമുള്ള പ്രധാന ഗിയർ" : "Consoles, mics, rigs, or lenses you bring to shows"}
              </Text>
            </View>
            {!showAddEquip && (
              <TouchableOpacity
                style={styles.addItemBtn}
                onPress={() => setShowAddEquip(true)}
              >
                <PlusIcon size={14} color={Colors.accent.amber} />
                <Text style={styles.addItemBtnText}>{isMl ? "ചേർക്കുക" : "Add"}</Text>
              </TouchableOpacity>
            )}
          </View>

          {showAddEquip && (
            <View style={styles.addFormContainer}>
              <Input
                label={isMl ? "ഉപകരണത്തിന്റെ പേര്" : "Gear / Equipment Name"}
                placeholder="e.g. Yamaha CL5 / Sony FX6 / Sennheiser G4"
                value={newEquipName}
                onChangeText={setNewEquipName}
              />
              <Input
                label={isMl ? "മോഡൽ / വിവരങ്ങൾ" : "Model or Spec"}
                placeholder="e.g. 64-Channel Digital Console"
                value={newEquipModel}
                onChangeText={setNewEquipModel}
              />
              <Text style={styles.fieldLabel}>{isMl ? "വിഭാഗം" : "Category"}</Text>
              <View style={styles.chipRow}>
                {EQUIPMENT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewEquipCategory(cat)}
                    style={[styles.chip, newEquipCategory === cat && styles.activeChip]}
                  >
                    <Text style={[styles.chipText, newEquipCategory === cat && styles.activeChipText]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.addFormActions}>
                <Button
                  title={isMl ? "റദ്ദാക്കുക" : "Cancel"}
                  variant="outline"
                  size="sm"
                  onPress={() => setShowAddEquip(false)}
                />
                <Button
                  title={isMl ? "സേവ് ചെയ്യുക" : "Save Equipment"}
                  variant="primary"
                  size="sm"
                  onPress={handleAddEquipment}
                />
              </View>
            </View>
          )}

          {equipmentOwned.length === 0 && !showAddEquip ? (
            <Text style={styles.emptyNote}>
              {isMl
                ? "ഉപകരണ വിവരങ്ങൾ നൽകിയിട്ടില്ല. സ്വന്തം ഗിയർ ഉണ്ടെങ്കിൽ ഇവിടെ ചേർക്കുക."
                : "No equipment listed. Add your owned equipment to attract gear-specific gigs."}
            </Text>
          ) : (
            equipmentOwned.map((item, idx) => (
              <View key={idx} style={styles.creditItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creditItemName}>{item.name}</Text>
                  <Text style={styles.creditItemMeta}>
                    {item.category || "Gear"} {item.model ? `• ${item.model}` : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveEquipment(idx)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <TrashIcon size={16} color={Colors.text.muted} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </Card>

        {/* Bio & Links */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            {t ? t("crew.bioPortfolio", "Bio & Portfolio") : "Bio & Portfolio"}
          </Text>

          <Input
            label={t ? t("crew.bio", "Professional Bio") : "Professional Bio"}
            placeholder={t ? t("crew.bioPlaceholderLong", "Brief summary of notable events, concerts, or films worked on") : "Brief summary of notable events, concerts, or films worked on"}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            inputStyle={styles.bioInput}
          />

          <Input
            label={t ? t("crew.portfolioLabel", "Portfolio Link (Instagram / Vimeo / IMDb)") : "Portfolio Link (Instagram / Vimeo / IMDb)"}
            placeholder="https://instagram.com/..."
            value={portfolioUrl}
            onChangeText={setPortfolioUrl}
            autoCapitalize="none"
          />
        </Card>

        <Button
          title={loading ? (t ? t("crew.saving", "Saving Changes...") : "Saving Changes...") : (t ? t("crew.saveProfile", "Save Profile") : "Save Profile")}
          variant="primary"
          size="lg"
          loading={loading}
          onPress={handleSave}
          style={styles.saveBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg.base,
  },
  content: {
    padding: Dimensions.screenPadding,
    paddingBottom: 80,
  },
  photoCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: Colors.bg.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border.base,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    backgroundColor: Colors.surface.raised,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.accent.amber,
    marginRight: 16,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoActions: {
    flex: 1,
  },
  photoTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
  },
  photoSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: 2,
    marginBottom: 8,
  },
  photoBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface.raised,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  changePhotoText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
  },
  removePhotoBtn: {
    padding: 6,
    borderRadius: Radius.full,
    backgroundColor: "rgba(224, 86, 36, 0.1)",
  },
  card: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: Colors.bg.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border.base,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.amber,
  },
  fieldSubtitle: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: 2,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text.secondary,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.raised,
    borderWidth: 1.5,
    borderColor: Colors.border.subtle,
  },
  activeChip: {
    borderColor: Colors.accent.amber,
    backgroundColor: "rgba(245, 166, 35, 0.15)",
  },
  chipText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.medium,
    color: Colors.text.secondary,
  },
  activeChipText: {
    color: Colors.accent.amber,
    fontWeight: Typography.weight.bold,
  },
  bioInput: {
    minHeight: 90,
    height: 100,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  switchLabel: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
  },
  switchSubtext: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: 2,
  },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: "rgba(245, 166, 35, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 166, 35, 0.3)",
  },
  addItemBtnText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.amber,
  },
  addFormContainer: {
    backgroundColor: Colors.surface.raised,
    padding: 12,
    borderRadius: Radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  twoColInputs: {
    flexDirection: "row",
  },
  addFormActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  creditItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.subtle,
  },
  creditItemName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semiBold,
    color: Colors.text.primary,
  },
  creditItemMeta: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: 2,
  },
  emptyNote: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  saveBtn: {
    marginTop: 12,
    marginBottom: 24,
  },
});

export default EditProfileScreen;
