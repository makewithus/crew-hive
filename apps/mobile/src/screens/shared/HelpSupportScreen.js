/**
 * apps/mobile/src/screens/shared/HelpSupportScreen.js
 * Help, direct WhatsApp support, and industry association coordination.
 */

import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from "react-native";
import { Colors, Radius, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import Button from "../../components/common/Button.js";
import { WhatsAppIcon } from "../../components/common/AvIcons.js";

export function HelpSupportScreen({ navigation, language, onToggleLanguage, t }) {
  const isMl = language === "ml";

  const handleOpenWhatsApp = () => {
    Linking.openURL("https://wa.me/918139002826?text=Hi%20CrewHive%20Team%2C%20I%20need%20assistance%20with%20my%20account.");
  };

  const handleOpenEmail = () => {
    Linking.openURL("mailto:support@crewhive.in?subject=CrewHive%20Support%20Inquiry");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t ? t("settings.helpSupport", "Help & Support") : "Help & Support"}
        subtitle={isMl ? "കേരള AV കമ്മ്യൂണിറ്റി സഹായം" : "Kerala AV Community Assistance"}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.supportCard}>
          <Text style={styles.cardTitle}>{isMl ? "വാട്സ്ആപ്പ് സഹായ കേന്ദ്രം" : "Direct WhatsApp Desk"}</Text>
          <Text style={styles.cardDesc}>
            {isMl
              ? "പ്രൊഫൈൽ, റിക്രൂട്ടർ വെരിഫിക്കേഷൻ, അസോസിയേഷൻ അംഗീകാരം എന്നിവയിൽ സംശയങ്ങളുണ്ടോ? വാട്സ്ആപ്പിൽ ഞങ്ങളുടെ കേരള കോർഡിനേഷൻ ടീമുമായി സംസാരിക്കാം."
              : "Need quick assistance with your crew profile, recruiter verification, or association credentials? Talk to our Kerala coordinator team on WhatsApp."}
          </Text>

          <Button
            title={isMl ? "വാട്സ്ആപ്പിൽ ബന്ധപ്പെടുക" : "Chat on WhatsApp"}
            variant="whatsapp"
            size="md"
            icon={<WhatsAppIcon size={20} color={Colors.brand.whatsapp} />}
            onPress={handleOpenWhatsApp}
            style={styles.chatBtn}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{isMl ? "ഇമെയിൽ സപ്പോർട്ട്" : "Email Support"}</Text>
          <Text style={styles.cardDesc}>
            {isMl
              ? "ഔദ്യോഗിക ആവശ്യങ്ങൾക്കും സാങ്കേതിക സഹായങ്ങൾക്കും:"
              : "For formal inquiries, association rosters, and technical issues:"}
          </Text>
          <TouchableOpacity onPress={handleOpenEmail}>
            <Text style={styles.emailLink}>support@crewhive.in</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{isMl ? "അസോസിയേഷനുകളും ഗിൽഡുകളും" : "Industry Associations & Guilds"}</Text>
          <Text style={styles.cardDesc}>
            {isMl
              ? "നിങ്ങൾ കേരളത്തിലെ സൗണ്ട്, ലൈറ്റിംഗ് അല്ലെങ്കിൽ സ്റ്റേജ് അസോസിയേഷൻ ഭാരവാഹിയാണോ? അംഗങ്ങൾക്ക് 0% കമ്മീഷനിൽ വെരിഫൈഡ് ബാഡ്ജുകൾ നൽകാൻ ക്ര്യൂഹൈവുമായി കൈകോർക്കാം."
              : "Are you a representative of a Kerala sound, lighting, cinematographers, or stage guild? CrewHive offers zero-commission bulk roster onboarding and verified member credential badges."}
          </Text>
          <Text style={styles.subtext}>
            Contact: partnerships@crewhive.in • Ph: +91 81390 02826
          </Text>
        </Card>

        <Text style={styles.sectionHeader}>{isMl ? "സാധാരണ ചോദ്യങ്ങൾ" : "FREQUENTLY ASKED QUESTIONS"}</Text>

        <Card style={styles.faqCard}>
          <Text style={styles.faqQ}>{isMl ? "ക്ര്യൂഹൈവ് എന്തെങ്കിലും കമ്മീഷൻ ഈടാക്കുമോ?" : "Does CrewHive charge any commission?"}</Text>
          <Text style={styles.faqA}>
            {isMl
              ? "ഇല്ല. ടെക്നീഷ്യൻമാരുടെ വേതനത്തിൽ നിന്ന് ക്ര്യൂഹൈവ് 0% കമ്മീഷനാണ് ഈടാക്കുന്നത്. എല്ലാ പണമിടപാടുകളും ക്രൂവും റിക്രൂട്ടർമാരും തമ്മിൽ നേരിട്ടാണ്."
              : "No. CrewHive charges 0% commission on technician wages or day rates. All payments and bookings are negotiated directly between crew and recruiters."}
          </Text>
        </Card>

        <Card style={styles.faqCard}>
          <Text style={styles.faqQ}>{isMl ? "18 മണിക്കൂർ ലഭ്യത എങ്ങനെ പ്രവർത്തിക്കുന്നു?" : "How does 18-hour availability work?"}</Text>
          <Text style={styles.faqA}>
            {isMl
              ? "നിങ്ങൾ 'Available Now' ഓൺ ചെയ്യുമ്പോൾ, അടുത്ത 18 മണിക്കൂർ നേരത്തേക്ക് നിങ്ങളുടെ പ്രൊഫൈൽ സെർച്ചുകളിൽ മുൻനിരയിൽ കാണിക്കും. സ്വകാര്യതയ്ക്കായി ലൊക്കേഷൻ ഏകദേശം 1.1 കി.മീ മാത്രമാണ് കാണിക്കുക. സമയം കഴിയുമ്പോൾ ഇത് തനിയെ ഓഫാകും."
              : "When you activate 'Available Now', your profile is indexed in active searches for up to 18 hours. Location is rounded to ~1.1km for privacy and automatically expires."}
          </Text>
        </Card>

        <Card style={styles.faqCard}>
          <Text style={styles.faqQ}>{isMl ? "അംഗീകാരം ലഭിക്കാൻ എന്തിനാണ് സമയം എടുക്കുന്നത്?" : "Why do I need admin approval?"}</Text>
          <Text style={styles.faqA}>
            {isMl
              ? "യഥാർത്ഥ ടെക്നീഷ്യന്മാരുടെ സുരക്ഷ ഉറപ്പാക്കാനും വ്യാജ പ്രൊഫൈലുകൾ ഒഴിവാക്കാനും ഓരോ രജിസ്ട്രേഷനും ഞങ്ങളുടെ ടീം പരിശോധിച്ച ശേഷമാണ് സെർച്ചിൽ ഉൾപ്പെടുത്തുന്നത്."
              : "To protect working technicians and maintain professional quality in Kerala's AV sector, our team manually verifies each registration before public search indexing."}
          </Text>
        </Card>
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
    paddingBottom: 24,
  },
  supportCard: {
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(37, 211, 102, 0.4)",
    marginBottom: 16,
  },
  card: {
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  chatBtn: {
    marginTop: 4,
  },
  emailLink: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semiBold,
    color: Colors.accent.amber,
  },
  subtext: {
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
  },
  sectionHeader: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.amber,
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 12,
  },
  faqCard: {
    padding: 16,
    marginBottom: 12,
  },
  faqQ: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  faqA: {
    fontSize: Typography.size.xs,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});

export default HelpSupportScreen;

