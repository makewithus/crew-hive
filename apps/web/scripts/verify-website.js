/**
 * Verification test script for CrewHive Website Prompt 1
 */

import fs from 'fs';
import path from 'path';
import { getWhatsAppNumber, isWhatsAppConfigured, getWhatsAppUrl, formatWhatsAppDisplay } from '../lib/whatsapp-config.js';

let failures = 0;
let passed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failures++;
  }
}

console.log('--- STARTING CREWHIVE WEBSITE VERIFICATION TESTS ---\n');

// 1. Localization Files Verification
const enCommon = JSON.parse(fs.readFileSync('./locales/en/common.json', 'utf8'));
const mlCommon = JSON.parse(fs.readFileSync('./locales/ml/common.json', 'utf8'));
const enHome = JSON.parse(fs.readFileSync('./locales/en/home.json', 'utf8'));
const mlHome = JSON.parse(fs.readFileSync('./locales/ml/home.json', 'utf8'));
const enAssoc = JSON.parse(fs.readFileSync('./locales/en/associations.json', 'utf8'));
const mlAssoc = JSON.parse(fs.readFileSync('./locales/ml/associations.json', 'utf8'));
const enLegal = JSON.parse(fs.readFileSync('./locales/en/legal.json', 'utf8'));
const mlLegal = JSON.parse(fs.readFileSync('./locales/ml/legal.json', 'utf8'));

assert(enHome.hero.headline === "Kerala's AV and events crew, in one place.", "English Hero headline matches requirement");
assert(mlHome.hero.headline === "കേരളത്തിലെ AV, ഇവന്റ് ക്രൂ ഒരു കുടക്കീഴിൽ.", "Malayalam Hero headline matches requirement");
assert(enHome.rolesShowcase.categories.length === 10, "English has exactly 10 professional role categories");
assert(mlHome.rolesShowcase.categories.length === 10, "Malayalam has exactly 10 professional role categories");

// 2. Roles Match Requirements
const expectedRoleIds = ['lighting', 'sound', 'rigging', 'sfx', 'camera', 'direction', 'art_set', 'photo_video', 'post', 'led_video'];
const actualEnRoleIds = enHome.rolesShowcase.categories.map(c => c.id);
const hasAllRoles = expectedRoleIds.every(id => actualEnRoleIds.includes(id));
assert(hasAllRoles, `Contains all 10 required role categories: ${expectedRoleIds.join(', ')}`);

// 3. Verification of How It Works steps
assert(enHome.howItWorks.crewSteps.length === 6, "How It Works: Exactly 6 steps for Crew");
assert(enHome.howItWorks.recruiterSteps.length === 6, "How It Works: Exactly 6 steps for Recruiters");
assert(mlHome.howItWorks.crewSteps.length === 6, "Malayalam How It Works: Exactly 6 steps for Crew");
assert(mlHome.howItWorks.recruiterSteps.length === 6, "Malayalam How It Works: Exactly 6 steps for Recruiters");

// 4. WhatsApp Configuration & Link Verification
const waNum = getWhatsAppNumber();
assert(waNum === "+918139002826", `WhatsApp number loaded from configuration: ${waNum}`);
assert(isWhatsAppConfigured() === true, "WhatsApp is marked as configured");
const waUrl = getWhatsAppUrl("Hi");
assert(waUrl === "https://wa.me/918139002826?text=Hi", `WhatsApp URL format is correct: ${waUrl}`);

// 5. Public Routes Existence
const publicRoutes = ['app/page.js', 'app/terms/page.js', 'app/privacy/page.js', 'app/contact/page.js'];
publicRoutes.forEach(r => {
  assert(fs.existsSync(r), `Public route file exists: ${r}`);
});

// 6. Insurance & False Statistics Audit across all new & modified files
const filesToCheck = [
  'app/page.js',
  'app/terms/page.js',
  'app/privacy/page.js',
  'app/contact/page.js',
  'components/PublicNavbar.js',
  'components/Footer.js',
  'components/AssociationForm.js',
  'components/WhatsAppButton.js',
  'locales/en/common.json',
  'locales/en/home.json',
  'locales/en/associations.json',
  'locales/en/legal.json',
  'locales/ml/common.json',
  'locales/ml/home.json',
  'locales/ml/associations.json',
  'locales/ml/legal.json',
];

const forbiddenTerms = [
  'icici',
  'lombard',
  'insurance shield',
  '473',
  '500+',
  '100% background-checked',
  'guaranteed bookings',
  'guaranteed employment',
];

let foundForbidden = [];
filesToCheck.forEach(file => {
  const content = fs.readFileSync(file, 'utf8').toLowerCase();
  forbiddenTerms.forEach(term => {
    if (content.includes(term.toLowerCase())) {
      foundForbidden.push({ file, term });
    }
  });
});

assert(foundForbidden.length === 0, `Zero forbidden marketing/insurance/statistic terms found in public files (found: ${JSON.stringify(foundForbidden)})`);

// 7. Verify Association Form Fields
const assocFormCode = fs.readFileSync('components/AssociationForm.js', 'utf8');
const requiredFields = ['associationName', 'contactPerson', 'phone', 'email', 'city', 'message'];
const hasAllFields = requiredFields.every(f => assocFormCode.includes(f));
assert(hasAllFields, `AssociationForm has all required fields: ${requiredFields.join(', ')}`);
assert(assocFormCode.includes('submittedAssociations'), "AssociationForm has duplicate submission protection");
assert(assocFormCode.includes('aria-required'), "AssociationForm has accessible aria-required attributes");

// Summary
console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failures} FAILED ---`);
process.exit(failures === 0 ? 0 : 1);
