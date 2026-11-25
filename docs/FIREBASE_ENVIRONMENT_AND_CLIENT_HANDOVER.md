# CrewHive Firebase Environment & Client Handover Architecture

**Document Version:** 1.0.0  
**Date:** November 13, 2026  
**Status:** Active Development (Configuration A) → Ready for Client Project Switch (Configuration B)  

---

## 1. Executive Summary & Dual Configuration Strategy

CrewHive utilizes a **centralized, unified backend architecture** where both the Next.js Web Application and the React Native / Expo Mobile Application communicate exclusively with a single Node.js / Express API (`/api/v1`). All Firebase Admin SDK operations, token exchanges, Firestore persistence, and role-based security policies are strictly governed by this backend.

To ensure non-blocking continuous engineering while awaiting the client's production Firebase credentials, the application operates in one of two configurations:

- **Configuration A (Current Development):**
  Uses the existing temporary development Firebase project (`crewhiveindia`). All developers, staging environments, and integration test runners execute against this project. Test phone authentication is strictly restricted to a single allowlisted development number (`+919876543210`) with a fixed test code (`123456`). All other numbers require genuine SMS/WhatsApp OTP delivery.
- **Configuration B (Future Client Handover):**
  Uses the client-provided Firebase project. Switching requires **zero business logic modification**—only environment variable updates and standard Firebase project provisioning (rules, indexes, app registrations).

---

## 2. Configuration A vs. Configuration B Matrix

| Dimension | Configuration A (Current Development) | Configuration B (Future Client Handover) |
|---|---|---|
| **Firebase Project ID** | `crewhiveindia` | Client-provided (e.g. `crewhive-prod`) |
| **Backend Service Account** | `firebase-adminsdk-fbsvc@crewhiveindia.iam.gserviceaccount.com` | Client production Service Account JSON / env |
| **Web Client App ID** | `1:946996301316:web:0f1df33f9ebad25fadaf51` | Client Web App Registration ID |
| **Android Package / SHA-256** | `com.crewhive.app` (Debug keystore SHA-256) | `com.crewhive.app` (Google Play Release Keystore SHA-256) |
| **iOS Bundle Identifier** | `com.crewhive.app` | `com.crewhive.app` (Apple Developer Team ID & APNs) |
| **Phone Auth Test Mode** | Enabled for `+919876543210` ONLY (`123456`) | Strictly DISABLED in production |
| **Real Numbers Auth** | Genuine random 6-digit OTP via MSG91 / WhatsApp | Genuine random 6-digit OTP via MSG91 / WhatsApp / Firebase SMS |
| **Storage Bucket** | `crewhiveindia.firebasestorage.app` / Cloudinary | Client Storage Bucket / Cloudinary |

---

## 3. Environment-Specific Variable Reference

### 3.1 Backend Express API (`backend/.env`)

| Variable | Development (Config A) | Production (Config B) | Description |
|---|---|---|---|
| `APP_ENV` | `development` | `production` | Platform runtime environment. |
| `NODE_ENV` | `development` | `production` | Node.js process environment. |
| `PORT` | `4000` | `4000` | HTTP listening port. |
| `FIREBASE_MODE` | `live` | `live` | `live` (credentialed), `emulator`, or `mock` (tests only). |
| `FIREBASE_ADMIN_PROJECT_ID` | `crewhiveindia` | `<client-project-id>` | Firebase Project Identifier. |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | `firebase-adminsdk-...@crewhiveindia...` | `<client-service-account-email>` | Service account email. |
| `FIREBASE_ADMIN_PRIVATE_KEY` | `"-----BEGIN PRIVATE KEY-----\n..."` | `"-----BEGIN PRIVATE KEY-----\n..."` | Service account private key (PEM). |
| `FIREBASE_WEB_API_KEY` | `AIzaSyCw7FowF5F-3nQ3t_arBIWLKgmfUGCfR6w` | `<client-web-api-key>` | Used server-side for custom-token session exchange. |
| `FIREBASE_TEST_PHONE` | `+919876543210` | *MUST BE UNSET IN PROD* | Allowlisted test number for dev test login. |
| `FIREBASE_TEST_OTP` | `123456` | *MUST BE UNSET IN PROD* | Allowlisted fixed test OTP for dev test login. |
| `OTP_PEPPER` | `dev-pepper-local-123` | `>=16 random characters` | HMAC secret for hashing OTPs at rest in Firestore. |
| `OTP_DEV_ECHO` | `false` | *MUST BE FALSE/UNSET* | Refused by `validateEnv()` in production. |
| `LOCAL_AUTH_BYPASS` | `false` | *MUST BE FALSE/UNSET* | Refused by `validateEnv()` in production. |
| `SUPER_ADMIN_PHONE` | `911234567890` | `<client-superadmin-phone>` | Normalized digits of bootstrap super-admin. |
| `ADMIN_PHONES` | `+918265940243` | `<client-admin-phones>` | Comma-separated admin phone numbers. |
| `MSG91_AUTH_KEY` | `<dev-key>` | `<client-msg91-auth-key>` | MSG91 telephony authorization key. |
| `MSG91_SENDER_ID` | `CRWHIV` | `CRWHIV` | DLT approved 6-character sender ID. |
| `MSG91_WHATSAPP_NUMBER` | `+918139002826` | `<client-whatsapp-number>` | Approved WhatsApp business virtual number. |
| `CORS_ORIGINS` | `http://localhost:3000` | `https://crewhive.in,https://www.crewhive.in` | Explicit allowed web origins. |

### 3.2 Mobile Expo Application (`apps/mobile/.env`)

| Variable | Value | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.crewhive.in/api/v1` | Public backend API URL. |
| `EXPO_PUBLIC_API_BASE_URL` | `https://api.crewhive.in/api/v1` | Redundant alias for backward compatibility. |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `<client-project-id>` | Client Firebase Project ID. |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `<client-web-api-key>` | Client Web API key for mobile SDK init. |
| `EXPO_PUBLIC_WHATSAPP_NUMBER` | `<client-whatsapp-number>` | Support and official platform WhatsApp contact. |
| `EXPO_PUBLIC_WEB_URL` | `https://crewhive.in` | Base URL for deep links and web account deletion. |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | `<cloudinary-cloud-name>` | Cloudinary CDN bucket. |
| `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`| `crewhive_unsigned_upload` | Unsigned image upload preset. |

### 3.3 Web Next.js Application (`apps/web/.env`)

| Variable | Value | Description |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `<client-project-id>` | Client Firebase Project ID. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `<client-web-api-key>` | Client Web API key. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `<client-project-id>.firebaseapp.com` | Auth redirect domain. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| `<client-project-id>.firebasestorage.app` | Storage bucket. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `<client-sender-id>` | Cloud messaging sender ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `<client-app-id>` | Web application registration ID. |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.crewhive.in` | Base URL to Express backend. |

---

## 4. Firestore Collections & Data Model

The shared Firestore database uses canonical normalized Indian mobile digits (e.g. `919876543210`) as document identifiers across core entities.

1. **`users/{id}`**: Root user identity (phone, name, role `crew|organizer|admin|super_admin`, approved, language, consent_version, createdAt).
2. **`crew/{id}`**: Detailed technician profile (name, roles, specialisations, city, district, experience, languages, ratePerDay, rateVisible, bio, portfolioLinks, pastCredits, equipmentOwned, travelWillingness, associationMembership, available, availableAt, availableExpiresAt, coarseLocation, locationConsent, completenessScore).
3. **`organizers/{id}`**: Recruiter organization entity (name, companyName, city, contactPerson, consentVersion, createdAt).
4. **`availability_requests/{id}`**: Broadcast or targeted availability requests from recruiters (recruiterId, role, date, location, workType, status, expiresAt, crewPings, totalPings, acceptedCount, declinedCount).
5. **`bookings/{id}`**: Individual booking / ping record per crew member for a request (requestId, crewId, status `pending|accepted|declined|expired`, responseDeadline, respondedAt, channel).
6. **`user_devices/{id}`**: Device push tokens for Expo/FCM delivery (userId, deviceToken, platform `android|ios`, updatedAt).
7. **`reports/{id}`**: Moderation reports submitted by users (reportedProfileId, reporterId, reason, details, status `pending|resolved|dismissed`, moderationAction).
8. **`blocks/{blockerId_blockedId}`**: Bidirectional exclusion records (blockerId, blockedId, createdAt).
9. **`otpCodes/{id}`**: Short-lived hashed verification codes (hash, createdAt, expiresAt, attempts, sentCount, windowStart).
10. **`shows/{id}`**: Recruiter show/event shortlist groupings (recruiterId, showName, crewMembers, createdAt).
11. **`prebookings/{id}`**: Date-hold pre-booking reservations (feature-flagged, status `pending|accepted|declined|expired|cancelled`).
12. **`feature_access/config`**: Dynamic feature gating rules (activeTier `free|trial|paid`, trialDurationDays, gatedFeatures).

---

## 5. Required Firestore Indexes

The following composite indexes must be deployed to the client's Firebase project via `firebase deploy --only firestore:indexes`:

```json
{
  "indexes": [
    {
      "collectionGroup": "crew",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "available", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "availability_requests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "recruiterId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "crewId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "reports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "blocks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "blockerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

## 6. Step-by-Step Client Project Switch Procedure

When the client provides their Firebase credentials, follow this exact checklist:

1. **Create Client Firebase Project**:
   Ensure Firestore is initialized in Native Mode (Region: `asia-south1` Mumbai recommended for Kerala lowest latency).
2. **Enable Authentication Providers**:
   - In Firebase Console > Authentication > Sign-in method:
   - Enable **Phone** authentication.
   - Add authorized domains: `crewhive.in`, `www.crewhive.in`, `api.crewhive.in`.
3. **Register Applications in Firebase Console**:
   - **Android App:** Package name `com.crewhive.app`. Add SHA-1 and SHA-256 release fingerprints from Google Play Console app signing.
   - **iOS App:** Bundle ID `com.crewhive.app`. Configure APNs authentication key for push notifications.
   - **Web App:** Register web app to obtain `apiKey`, `appId`, `messagingSenderId`.
4. **Generate Backend Service Account**:
   - In Project Settings > Service accounts > Generate new private key.
   - Store credentials securely in production secrets vault (Google Secret Manager or environment variables).
5. **Deploy Security Rules & Indexes**:
   ```bash
   firebase use <client-project-id>
   firebase deploy --only firestore:rules,firestore:indexes
   ```
6. **Update Environment Files**:
   - Set `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, and `FIREBASE_ADMIN_PRIVATE_KEY` on Express production host.
   - Set `APP_ENV=production` and `NODE_ENV=production`.
   - Remove any development test number variables.
7. **Verify Server Startup Safeguards**:
   - Check startup logs for:
     `[Firebase Safeguard] Active mode: "live" | Project: "<client-project-id>" | Environment: "production"`
   - Verify that any attempt to start with `FIREBASE_TEST_PHONE` or `LOCAL_AUTH_BYPASS` in production throws `INVALID_CONFIG`.

---

## 7. Rollback Procedure

If the client project experiences unexpected permission or quota failures upon initial deployment:
1. Revert `FIREBASE_ADMIN_*` environment variables on the backend server to Configuration A (`crewhiveindia`).
2. Restart backend processes (`pm2 restart crewhive-api` or container restart).
3. Confirm health endpoint: `GET /health` returns `status: "ok"`.
4. Investigate missing IAM roles (specifically `Cloud Datastore User` and `Firebase Authentication Admin`) on the client service account.

---

## 8. Production Security & Compliance Checklist

- [x] Zero hardcoded API keys or service account private keys in Git repository.
- [x] Fail-closed validation in `backend/config/env.js`: refuses startup if credentials or required encryption pepper are missing in production.
- [x] Strict test-number isolation: `FIREBASE_TEST_PHONE` bypass operates solely in non-production environments and solely for the allowlisted number.
- [x] All client requests require verified Firebase ID tokens; client-asserted roles are rejected.
- [x] Location privacy enforced: coordinates rounded to 2 decimal places (~1.1km coarse accuracy) with zero historical GPS logs.
- [x] Full compliance with India Digital Personal Data Protection (DPDP) Act 2023: in-app deletion, web deletion page link, and location consent withdrawal.

