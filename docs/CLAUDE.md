# CrewHive — Claude & Agent Developer Guide (CLAUDE.md)
**Project:** CrewHive — Kerala's AV and Events Crew Network  
**Positioning:** *"Kerala's AV and events crew, in one place."* (കേരളത്തിലെ AV & ഇവന്റ് ക്രൂ, ഒരിടത്ത്.)  
**Repository Type:** Monorepo (npm workspaces)  

---

## 1. Monorepo Structure & Workspaces

```
CrewHive/
├── apps/
│   ├── web/               # Next.js 16.2.0 (Turbopack, App Router, Tailwind CSS)
│   └── mobile/            # React Native / Expo SDK 54 (iOS & Android application)
├── backend/               # Express 4.21.2 Unified REST API (/api/v1) + Firebase Admin SDK
├── packages/
│   └── shared/            # Shared taxonomy, validation, DTO mappers, completeness logic
├── docs/
│   ├── architecture/      # System & Monorepo Architecture Specifications
│   ├── api/               # API Reference Documentation
│   ├── setup/             # Developer Environment Setup
│   └── audit/             # Master Consolidated Audit Report
├── BRANDING.md            # Official Design Tokens, Color Palette & Typography
└── README.md              # Production Setup & Firebase Configuration Guide
```

---

## 2. Essential Commands

### Development
```bash
# Run web application (localhost:3000)
npm run dev:web

# Run Express backend (localhost:5001)
npm run dev:backend

# Run mobile app dev server
npm run dev:mobile
```

### Testing & Verification
```bash
# Run all automated test suites (Shared + Backend + Web)
npm run test:all

# Run individual test suites
npm run test:shared            # @crew-hive/shared unit tests (7 tests)
npm run test:backend           # Express backend integration & security suite (66 tests)
npm run test:web               # Next.js website experience & session tests (36 tests)

# Website verification & responsiveness checks
npm run verify --workspace=web               # Content, branding & taxonomy rules (20 tests)
npm run verify:responsiveness --workspace=web # Responsive breakpoints & a11y (19 tests)
```

### Production Build
```bash
# Build Next.js website (Turbopack production build)
npm run build:web
```

---

## 3. Core Architecture & Architectural Invariants

### 3.1 Unified Express Backend (`/api/v1`)
- **No Direct Client Firestore Calls:** Neither the Next.js client nor the React Native mobile app calls the Firestore Web SDK directly for application data mutations. All requests go through the Express backend via Firebase Admin SDK.
- **Next.js API Proxy Layer:** Next.js API routes (`web/app/api/*`) act as thin proxies (`web/lib/express-proxy.js`) routing to `http://localhost:5001/api/v1/*`.
- **Client API Client:** Web client requests use `apiFetch` in `web/lib/api-client.js`, which automatically attaches the active Firebase ID token as an `Authorization: Bearer <token>` header.

### 3.2 Authentication & Authorization Security
- **Server-Side Token Verification:** Express middleware (`backend/middleware/auth.middleware.js`) invokes `admin.auth().verifyIdToken(token, true)` on all protected endpoints.
- **Identity Derivation:** The authenticated caller's identity (`req.user.id`, `req.user.phone`) is strictly extracted from the validated Firebase ID token. Client-supplied IDs or phones in request bodies are ignored.
- **Server-Enforced Roles:** Roles (`crew`, `organizer`, `admin`, `super_admin`) are resolved server-side from `users/{id}` in Firestore. Super admin privileges require matching `SUPER_ADMIN_PHONE` from server environment variables.
- **Fail-Closed Production Startup:** Express refuses to boot if `LOCAL_AUTH_BYPASS` or `OTP_DEV_ECHO` is enabled in production (`backend/tests/failclosed.test.js`).

### 3.3 Privacy & Data Protection
- **Coarse Location Rounding:** GPS coordinates are rounded to 2 decimal places (~1.1 km precision) before storage. Exact coordinates are never requested, stored, or returned.
- **Sanitized Public DTOs:** Public search (`GET /api/v1/crew`) and profile endpoints (`GET /api/v1/crew/:id`) strictly redact raw phone numbers, exact coordinates, and private day rates (`rateVisibility: 'private'`).
- **Session Timeout:** Web sessions enforce a strict 10-minute inactivity timeout with a 5-second countdown warning modal (`web/components/InactivityTimeout.js`).

---

## 4. Role Taxonomy & Geography Standards

### 4.1 Canonical 10 Parent Roles (`packages/shared/src/taxonomy/roles.js`)
1. `lighting` — Lighting (ലൈറ്റിംഗ്)
2. `sound` — Sound (ശബ്ദം)
3. `rigging` — Rigging & Staging (റിഗ്ഗിംഗും സ്റ്റേജിംഗും)
4. `sfx` — SFX & Special Effects (പ്രത്യേക ഇഫക്റ്റുകൾ)
5. `camera` — Camera & Broadcast (ക്യാമറയും സംപ്രേക്ഷണവും)
6. `direction` — Direction & Production (സംവിധാനവും നിർമ്മാണവും)
7. `art_set` — Art & Set Construction (ആർട്ട് & സെറ്റ്)
8. `photo_video` — Photography & Video (ഫോട്ടോഗ്രാഫിയും വീഡിയോഗ്രാഫിയും)
9. `post` — Post-Production & Editing (പോസ്റ്റ്-പ്രൊഡക്ഷൻ & എഡിറ്റിംഗ്)
10. `led_video` — LED Wall & Visual Display (LED വാൾ & ഡിസ്‌പ്ലേ)

### 4.2 Kerala Geography (`packages/shared/src/taxonomy/cities.js`)
- **Primary Launch Hubs:** Kochi (കൊച്ചി), Thiruvananthapuram (തിരുവനന്തപുരം), Kozhikode (കോഴിക്കോട്).
- **All 14 Kerala Revenue Districts:** Alappuzha, Ernakulam, Idukki, Kannur, Kasaragod, Kollam, Kottayam, Kozhikode, Malappuram, Palakkad, Pathanamthitta, Thiruvananthapuram, Thrissur, Wayanad.

---

## 5. UI/UX & Design Guidelines

- **Theme & Colors:** Dark mode default. Base background `zinc-950` (`#09090b`), card surfaces `zinc-900` (`#18181b`), borders `zinc-800` (`#27272a`), amber accents `#F5A623` / `#D48208`.
- **Touch Targets:** Minimum 44x44px for all clickable elements; 48px minimum height for primary buttons.
- **Mobile Input Size:** Inputs must enforce `16px` base font size to prevent automated iOS Safari zoom on focus.
- **Bilingual Support:** Full English and Malayalam localization via `LanguageContext` and JSON dictionaries in `web/locales/`.
- **No Forbidden Copy:** Zero positive claims of insurance coverage at launch; zero fake counters (`"473 joined"`, `"500+ waiting"`); zero unverified partner logos.

---

## 6. Authoritative Reference Documentation

- **System Architecture:** `docs/architecture/CREWHIVE_SYSTEM_ARCHITECTURE.md`
- **Monorepo Architecture:** `docs/architecture/CREWHIVE_MONOREPO_ARCHITECTURE.md`
- **Backend API Contract:** `backend/docs/API_CONTRACT.md`
- **Full API Endpoint Reference:** `docs/api/CREWHIVE_API_REFERENCE.md`
- **Developer Environment Setup:** `docs/setup/DEVELOPMENT_SETUP.md`
- **Master Consolidated Audit:** `docs/audit/CREWHIVE_WEBSITE_MASTER_AUDIT_REPORT.md`
- **Mobile Guidelines:** `mobile/AGENTS.md`
- **Design Tokens:** `BRANDING.md`

