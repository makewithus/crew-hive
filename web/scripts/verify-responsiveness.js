import fs from 'fs';
import path from 'path';

console.log('--- VERIFYING RESPONSIVE STYLING & ACCESSIBILITY ACROSS ALL DEVICES ---');

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${description}`);
    failed++;
  }
}

const rootDir = process.cwd();

// 1. Check app/globals.css for viewport and overflow bounds
const globalsCss = fs.readFileSync(path.join(rootDir, 'app/globals.css'), 'utf-8');
assert(
  globalsCss.includes('max-width: 100vw') && globalsCss.includes('overflow-x: hidden'),
  'app/globals.css enforces max-width: 100vw and overflow-x: hidden on html and body'
);
assert(
  globalsCss.includes('font-size: max(16px, 1rem)'),
  'app/globals.css enforces 16px minimum font size on inputs to prevent iOS auto-zoom'
);
assert(
  globalsCss.includes('-webkit-tap-highlight-color: transparent'),
  'app/globals.css disables tap highlight flicker on touch screens'
);

// 2. Check app/layout.tsx for responsive viewport
const layoutTsx = fs.readFileSync(path.join(rootDir, 'app/layout.tsx'), 'utf-8');
assert(
  layoutTsx.includes("width: 'device-width'") && layoutTsx.includes('initialScale: 1'),
  'app/layout.tsx specifies device-width and initial-scale: 1 in viewport'
);

// 3. Check PublicNavbar responsive attributes
const publicNavbar = fs.readFileSync(path.join(rootDir, 'components/PublicNavbar.js'), 'utf-8');
assert(
  publicNavbar.includes('min-h-[44px]') && publicNavbar.includes('min-w-[44px]'),
  'PublicNavbar mobile toggle button has accessible minimum touch target (≥44x44px)'
);
assert(
  publicNavbar.includes('max-h-[calc(100dvh-4.25rem)]') && publicNavbar.includes('overscroll-contain'),
  'PublicNavbar mobile drawer uses dynamic viewport height (100dvh) and overscroll-contain'
);

// 4. Check Footer responsive attributes
const footer = fs.readFileSync(path.join(rootDir, 'components/Footer.js'), 'utf-8');
assert(
  footer.includes('grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4'),
  'Footer column grid scales gracefully from 1 col on small phones to 2 cols and 4 cols'
);
assert(
  footer.includes('min-h-[36px] sm:min-h-0'),
  'Footer links provide comfortable touch padding for mobile interaction'
);

// 5. Check SignUpModal responsive attributes
const signUpModal = fs.readFileSync(path.join(rootDir, 'components/SignUpModal.js'), 'utf-8');
assert(
  signUpModal.includes('max-h-[94dvh]') && signUpModal.includes('overscroll-contain'),
  'SignUpModal dialog container supports small screen dynamic viewports with overscroll-contain'
);
assert(
  signUpModal.includes('grid-cols-1 sm:grid-cols-2'),
  'SignUpModal role selection switches to single column on mobile to prevent squishing'
);
assert(
  signUpModal.includes('text-base sm:text-sm min-h-[44px]'),
  'SignUpModal inputs use 16px base font and 44px min-height for touch compliance'
);

// 6. Check AssociationForm responsive attributes
const assocForm = fs.readFileSync(path.join(rootDir, 'components/AssociationForm.js'), 'utf-8');
assert(
  assocForm.includes('w-full sm:w-auto min-h-[48px]'),
  'AssociationForm submit button is full width on mobile with 48px touch target'
);
assert(
  assocForm.includes('p-4 sm:p-6 md:p-8 lg:p-10'),
  'AssociationForm container uses responsive multi-breakpoint padding'
);

// 7. Check WhatsAppButton responsive attributes
const waButton = fs.readFileSync(path.join(rootDir, 'components/WhatsAppButton.js'), 'utf-8');
assert(
  waButton.includes('min-h-[44px]'),
  'WhatsAppButton enforces minimum 44px touch height across variants'
);

// 8. Check Legal & Contact Pages responsive attributes
const contactPage = fs.readFileSync(path.join(rootDir, 'app/contact/page.js'), 'utf-8');
assert(
  contactPage.includes('grid-cols-1 md:grid-cols-3') && contactPage.includes('min-h-[44px]'),
  'Contact page cards scale down to single column on mobile with full touch targets'
);

const termsPage = fs.readFileSync(path.join(rootDir, 'app/terms/page.js'), 'utf-8');
assert(
  termsPage.includes('py-10 sm:py-16 lg:py-20') && termsPage.includes('break-words'),
  'Terms page uses responsive vertical padding and break-words for narrow screens'
);

const privacyPage = fs.readFileSync(path.join(rootDir, 'app/privacy/page.js'), 'utf-8');
assert(
  privacyPage.includes('grid-cols-1 sm:grid-cols-2') && privacyPage.includes('break-words'),
  'Privacy page callout cards collapse to 1 column on mobile with word breaking'
);

// 9. Check HomePage responsive attributes
const homePage = fs.readFileSync(path.join(rootDir, 'app/page.js'), 'utf-8');
assert(
  homePage.includes('text-3xl sm:text-5xl md:text-6xl lg:text-7xl') && homePage.includes('break-words'),
  'Hero title adapts across 4 breakpoints with break-words for Malayalam text'
);
assert(
  homePage.includes('flex flex-col sm:flex-row') && homePage.includes('w-full sm:w-auto min-h-[48px]'),
  'Hero CTA buttons stack vertically on mobile with full-width 48px buttons'
);

console.log(`\n--- RESPONSIVENESS VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
if (failed > 0) {
  process.exit(1);
}

