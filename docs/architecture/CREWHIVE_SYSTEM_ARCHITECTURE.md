# CrewHive System Architecture Specification

**Document Version:** 1.0.0  
**Status:** Canonical Reference  
**Scope:** Monorepo Architecture (`apps/web`, `apps/mobile`, `services/api`, `packages/shared`, `firebase/`)

---

## 1. System Overview

CrewHive is a unified multi-platform platform designed to connect skilled audio-visual and event technicians with production houses and recruiters across Kerala.

```
                          ┌────────────────────────┐
                          │    Next.js Website     │
                          │      (apps/web)        │
                          └───────────┬────────────┘
                                      │
                                      ▼
┌────────────────────────┐      ┌─────────────────────────┐
│   React Native Expo    │─────►│  Shared Express Backend │
│      (apps/mobile)     │      │     (services/api)      │
│                        │      │      (/api/v1/*)        │
└────────────────────────┘      └────────────┬────────────┘
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       │                     │                     │
                       ▼                     ▼                     ▼
             ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
             │ Firebase Admin   │  │ Shared Constants │  │ Telephony & SMS  │
             │   & Firestore    │  │ (@crew-hive/     │  │ (MSG91 WhatsApp  │
             │   (Data Store)   │  │    shared)       │  │    & OTP)        │
             └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 2. Directory Structure & Workspace Layout

```text
CREWHIVE
│
├── apps/
│   ├── web/                    Next.js 15 Website (Tailwind v4, React 19)
│   │   ├── app/                App Router routes (Public, Crew, Organizer, Admin)
│   │   ├── components/         Web UI components (Navbar, Footer, Modals, CrewCard)
│   │   └── lib/                Firebase client & shared utility connectors
│   │
│   └── mobile/                 React Native Expo Application (Expo SDK 54, JavaScript)
│       ├── src/
│       │   ├── components/     Native UI components (Button, Input, Card, Badge)
│       │   ├── constants/      Theme & design tokens from BRANDING.md
│       │   ├── hooks/          Auth, Network, Location, and Query hooks
│       │   ├── localization/   Bilingual dictionaries (en.json, ml.json)
│       │   ├── navigation/     Root navigator, Bottom Tab bar, Auth stack
│       │   ├── screens/        P0 & P1 screens (Shared, Crew, Recruiter)
│       │   └── services/       API client, secure store, location, notifications
│       ├── assets/             Icons, adaptive icons, splash screens
│       ├── App.js              Root component entry
│       └── app.json            Expo configuration & deep link scheme
│
├── services/
│   └── api/                    Shared Node.js Express.js Backend Service
│       ├── src/
│       │   ├── config/         Environment, Firebase Admin, and App configuration
│       │   ├── controllers/    Route handlers for /api/v1/* endpoints
│       │   ├── middleware/     Auth, Roles, RateLimiter, Validation, Audit, Errors
│       │   ├── repositories/   Direct Firestore data access methods
│       │   ├── routes/         Express router definitions grouped by domain
│       │   ├── services/       Core business logic & workflow orchestration
│       │   ├── integrations/   WhatsApp template adapter & FCM push adapter
│       │   ├── jobs/           Availability auto-expiry background worker
│       │   └── app.js          Express application factory
│       ├── tests/              Node.js test suite for all API domains
│       └── server.js           Service execution entrypoint (port 4000)
│
├── packages/
│   └── shared/                 Single Source of Truth Library (@crew-hive/shared)
│       ├── src/
│       │   ├── constants/      Branding tokens, thresholds, app metadata
│       │   ├── enums/          UserRole, AvailabilityStatus, RequestStatus
│       │   ├── role-taxonomy/  10 Parent Roles, 34 Specialisations, EN/ML labels
│       │   ├── cities/         Launch cities (Kochi, TVM, Kozhikode) & 14 districts
│       │   ├── validation/     Phone normalizer, OTP check, input sanitizers
│       │   ├── utils/          Profile completeness calculation engine
│       │   └── api-contracts/  Standard API response envelopes & error codes
│       └── tests/              Unit tests for pure domain logic
│
├── firebase/                   Firestore Security Rules & Configuration
│   ├── firestore.rules         Production security rules enforcing RBAC
│   └── firebase.json           Firebase project bindings
│
├── docs/                       Architecture, Traceability & API documentation
│   ├── architecture/
│   ├── api/
│   ├── implementation/
│   ├── branding/
│   └── testing/
│
├── BRANDING.md                 Root Brand Guidelines & Design System
├── package.json                Monorepo workspace definitions
└── README.md                   Developer setup & execution instructions
```

---

## 3. Data Architecture & Firestore Schema

Both the Next.js website and the React Native mobile app communicate with the same Firestore database (`crewhive-net`).

### 3.1 Collections & Schemas

1. **`users` (Canonical Identity):**
   - Document ID: Normalized Indian phone number digits (e.g. `919876543210`).
   - Fields: `id`, `phone`, `role` (`"crew"` | `"organizer"` | `"admin"`), `name`, `language` (`"en"` | `"ml"`), `consent_version` (`"1.0"`), `consent_at`, `approved` (boolean), `createdAt`, `updatedAt`.

2. **`crew` (Detailed Technician Profiles):**
   - Document ID: Matches `users` document ID (`userId`).
   - Fields: `userId`, `name`, `phone`, `role` (parent role ID), `parentRole`, `specialisations` (array of string IDs), `city`, `district`, `experience`, `languages` (array of strings), `ratePerDay` (number), `rateVisibility` (`"public"` | `"private"`), `showRate` (boolean), `available` (boolean), `availableExpiresAt` (ISO timestamp), `coarseLocation` (`{ lat: 9.93, lng: 76.26, city: "Kochi" }`), `bio` (string), `profileImage` (URL), `portfolioLinks` (`{ youtube: "", instagram: "" }`), `credits` (array of objects), `equipmentOwned` (array of strings), `associationMember` (boolean), `associationName` (string), `profileCompleteness` (integer 0–100), `approved` (boolean), `createdAt`, `updatedAt`.

3. **`organizers` (Recruiter Profiles):**
   - Document ID: Matches `users` document ID.
   - Fields: `userId`, `company`, `name`, `city`, `phone`, `createdAt`, `updatedAt`.

4. **`availability_requests` (Recruiter Inquiries):**
   - Document ID: Auto-generated string.
   - Fields: `id`, `recruiterId`, `recruiterName`, `role`, `specialisation`, `location`, `city`, `date`, `workType`, `notes`, `status` (`"pending"` | `"completed"` | `"cancelled"`), `targetCrewIds` (array of matched crew IDs, max 10), `responses` (`{ [crewId]: { status: "accepted"|"declined", respondedAt: timestamp, channel: "app"|"web" } }`), `createdAt`, `expiresAt`.

5. **`associations` & `association_members`:**
   - Fields: `name`, `city`, `join_code`, `status`, `memberCount`.
   - Member Roster: `associationId`, `phone`, `name`, `status` (`"pending_invite"` | `"verified"`).

6. **`reports` (Moderation):**
   - Fields: `id`, `reporterId`, `targetId`, `targetType` (`"crew"` | `"organizer"`), `reason`, `details`, `status` (`"pending"` | `"resolved"` | `"dismissed"`), `createdAt`.

7. **`notifications` (In-App Messaging):**
   - Fields: `id`, `userId`, `title`, `body`, `type` (`"request"` | `"response"` | `"system"`), `data` (metadata payload), `read` (boolean), `createdAt`.

8. **`audit_logs` (Security & DPDP Traceability):**
   - Fields: `id`, `actorId`, `action`, `targetId`, `metadata`, `timestamp`.

---

## 4. Security & Privacy Architecture

1. **Role-Based Access Control (RBAC):**
   - Server-side token verification using Firebase ID token or verified developer auth token.
   - Crew cannot modify recruiter requests; recruiters cannot alter crew availability.
   - Only admins can approve profiles, hide accounts, and resolve moderation reports.
2. **Location Privacy (DPDP Mandate):**
   - Absolute prohibition on raw continuous GPS tracking.
   - Coordinates rounded to 2 decimal places (~1.1 km accuracy) exclusively when availability is explicitly turned ON.
   - Location cleared when availability is turned OFF.
   - Manual district fallback provided when location permission is declined.
3. **Account Deletion Protocol:**
   - Permanent removal of personal records from `users`, `crew`, and `organizers`.
   - Revocation of Firebase Authentication tokens and cleanup of active notification subscriptions.
   - Audit trail recorded in `audit_logs` without retaining sensitive personally identifiable information.

