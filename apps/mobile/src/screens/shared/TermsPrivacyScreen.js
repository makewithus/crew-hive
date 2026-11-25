/**
 * apps/mobile/src/screens/shared/TermsPrivacyScreen.js
 * Legal disclosures, terms of service, and privacy charter.
 */

import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, StyleSheet, ScrollView } from "react-native";
import { Colors, Typography, Dimensions } from "../../constants/theme.js";
import Header from "../../components/common/Header.js";
import Card from "../../components/common/Card.js";
import { CURRENT_CONSENT_VERSION } from "@crew-hive/shared";

export function TermsPrivacyScreen({ navigation, language, onToggleLanguage, t }) {
  const isMl = language === "ml";

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t ? t("settings.terms", "Terms & Privacy") : "Terms & Privacy"}
        subtitle={isMl ? `പതിപ്പ് ${CURRENT_CONSENT_VERSION}` : `Version ${CURRENT_CONSENT_VERSION}`}
        showBack={true}
        onBack={() => navigation.goBack()}
        language={language}
        onToggleLanguage={onToggleLanguage}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.heading}>
            {isMl ? "1. പ്ലാറ്റ്‌ഫോം റോളും 0% കമ്മീഷനും" : "1. Platform Role & Zero Commission"}
          </Text>
          <Text style={styles.body}>
            {isMl
              ? "കേരളത്തിലെ ഓഡിയോ-വിഷ്വൽ, ലൈവ് ഇവന്റ് മേഖലയിലുള്ള പ്രൊഫഷണലുകളെ കണ്ടെത്തുന്നതിനുള്ള ഒരു ഡയറക്ടറിയും കോർഡിനേഷൻ പ്ലാറ്റ്‌ഫോമുമായാണ് ക്ര്യൂഹൈവ് പ്രവർത്തിക്കുന്നത്. ക്ര്യൂഹൈവ് ഒരു തൊഴിലുടമയോ ഇടനിലക്കാരനോ അല്ല. ടെക്നീഷ്യൻമാരുടെ വേതനത്തിൽ നിന്ന് യാതൊരു കമ്മീഷനും ഈടാക്കുന്നില്ല."
              : "CrewHive operates strictly as a professional networking, search directory, and availability coordination platform for the audio-visual, film, and live event sector in Kerala. CrewHive does not act as an employer, agent, or contractor, and charges 0% commission on technician day rates or remuneration."}
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.heading}>
            {isMl ? "2. DPDP നിയമം 2023 അനുസൃതമായ സ്വകാര്യതാ സംരക്ഷണം" : "2. DPDP Act 2023 Compliance & Data Minimization"}
          </Text>
          <Text style={styles.body}>
            {isMl
              ? "ഇന്ത്യയിലെ ഡിജിറ്റൽ വ്യക്തിഗത വിവര സംരക്ഷണ നിയമം (DPDP Act 2023) പൂർണ്ണമായി പാലിക്കുന്നു. കൃത്യമായ GPS ലൊക്കേഷൻ ഒരിക്കലും ശേഖരിക്കുകയോ പങ്കിടുകയോ ഇല്ല. 18 മണിക്കൂർ ലഭ്യത ഓൺ ചെയ്യുമ്പോൾ ഏകദേശ ലൊക്കേഷൻ (~1.1 കി.മീ) മാത്രമേ ഉപയോഗിക്കൂ. അക്കൗണ്ട് ഡിലീറ്റ് ചെയ്യാനുള്ള പൂർണ്ണ അവകാശം നിങ്ങൾക്കുണ്ട്."
              : "We adhere strictly to India's Digital Personal Data Protection Act (DPDP) 2023. We collect only minimal required information for service delivery. Exact high-precision GPS coordinates are never stored or shared; location is coarsely rounded to 2 decimal places (~1.1km) and active only during the temporary 18-hour availability window. You retain the right to complete erasure at any time via Settings."}
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.heading}>
            {isMl ? "3. ലഭ്യത അന്വേഷണങ്ങളും നേരിട്ടുള്ള ബന്ധപ്പെടലും" : "3. Availability Requests & Direct Contact"}
          </Text>
          <Text style={styles.body}>
            {isMl
              ? "റിക്രൂട്ടർമാർക്ക് പരമാവധി 10 സാങ്കേതിക പ്രവർത്തകർക്ക് മാത്രമേ ഒരു സമയം അന്വേഷണം അയക്കാൻ സാധിക്കൂ. ഒരു വിദഗ്ദ്ധൻ അന്വേഷണം പരിശോധിച്ച് 'YES' നൽകിയാൽ മാത്രമേ ഫോൺ നമ്പർ റിക്രൂട്ടർക്ക് ലഭ്യമാകൂ."
              : "Recruiters may dispatch availability inquiries to relevant technicians up to a capped maximum of 10 candidates per request. Technician contact phone numbers are disclosed strictly when a technician reviews and explicitly accepts the inquiry by responding \"YES\"."}
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.heading}>
            {isMl ? "4. ഉപകരണങ്ങളും ബാധ്യതകളും" : "4. Equipment & Liability Disclaimer"}
          </Text>
          <Text style={styles.body}>
            {isMl
              ? "ക്ര്യൂഹൈവ് ഉപകരണ ഇൻഷുറൻസോ വ്യക്തിഗത സുരക്ഷാ പരിരക്ഷയോ നൽകുന്നില്ല. ഇവന്റുകളിലെ ഉപകരണ കൈകാര്യം ചെയ്യലും സുരക്ഷാ കരാറുകളും ബന്ധപ്പെട്ട കക്ഷികൾ തമ്മിൽ നേരിട്ട് തീരുമാനിക്കേണ്ടതാണ്."
              : "CrewHive is not an insurer, underwriter, or financial intermediary. The platform does not provide equipment insurance or personal accident coverage. All equipment handling, event safety, and booking agreements are negotiated directly between the respective parties."}
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.heading}>
            {isMl ? "5. പ്രൊഫഷണൽ പെരുമാറ്റച്ചട്ടം" : "5. Professional Code of Conduct"}
          </Text>
          <Text style={styles.body}>
            {isMl
              ? "വിദഗ്ദ്ധരും റിക്രൂട്ടർമാരും പരസ്പര ബഹുമാനത്തോടെയും സമയനിഷ്ഠയോടെയും പ്രവർത്തിക്കാൻ ബാധ്യസ്ഥരാണ്. വ്യാജ യോഗ്യതാ വിവരങ്ങൾ നൽകുകയോ സ്ഥിരീകരിച്ച ഷെഡ്യൂളുകളിൽ എത്താതിരിക്കുകയോ ചെയ്താൽ പ്രൊഫൈൽ റദ്ദാക്കപ്പെടാം."
              : "Both technicians and recruiters agree to uphold professional communication, fair dealing, and punctual reporting to confirmed call times. Misrepresentation of trade credentials, ghosting confirmed dates, or abusive conduct may result in profile de-indexing and association reporting."}
          </Text>
        </Card>

        <Text style={styles.footerNote}>
          {isMl ? "ക്ര്യൂഹൈവ് ലീഗൽ ഓപ്പറേഷൻസ് • കൊച്ചി, കേരളം, ഇന്ത്യ\nകൺടാക്റ്റ്: legal@crewhive.in" : "CrewHive Legal Operations • Kochi, Kerala, India\nContact: legal@crewhive.in"}
        </Text>
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
  card: {
    padding: 16,
    marginBottom: 16,
  },
  heading: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.accent.amber,
    marginBottom: 8,
  },
  body: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  footerNote: {
    textAlign: "center",
    fontSize: Typography.size.xs,
    color: Colors.text.muted,
    marginTop: 16,
    lineHeight: 18,
  },
});

export default TermsPrivacyScreen;

