# CrewHive Shared Express Backend — API Reference (`v1`)

This document is the authoritative API specification for the CrewHive shared Node.js Express backend (`services/api/`). It defines all endpoints, authentication contracts, request/response envelopes, error codes, and curl examples.

- **Base URL:** `http://localhost:5000/api/v1` (or deployed environment URL)
- **Healthcheck:** `GET /health`
- **Standard Protocol:** RESTful JSON over HTTPS
- **Language / Runtime:** Pure JavaScript (Node.js 20+, Express 4.x)
- **Database:** Firebase Cloud Firestore (`crewhive-net`)

---

## 1. Global Request & Response Conventions

### 1.1 Headers
| Header | Description | Required |
| :--- | :--- | :--- |
| `Content-Type` | `application/json` | For all `POST`, `PUT`, `PATCH`, `DELETE` with bodies |
| `Authorization` | `Bearer <FIREBASE_ID_TOKEN>` | For all authenticated endpoints |
| `x-dev-phone` | E.g. `+919876543210` (Bypasses SMS in development / testing) | Optional in non-production |
| `x-dev-role` | `crew`, `recruiter`, `admin` | Optional in non-production |

### 1.2 Standard Success Envelope
```json
{
  "success": true,
  "data": { ... }
}
```

### 1.3 Standard Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable explanation of error.",
    "details": null
  }
}
```

### 1.4 HTTP Status Code Map
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure or malformed payload.
- `401 Unauthorized`: Missing or invalid bearer token.
- `403 Forbidden`: Authenticated user lacks required role (e.g. non-admin calling `/admin/*`).
- `404 Not Found`: Resource does not exist.
- `429 Too Many Requests`: Rate limit exceeded (e.g. OTP spam protection).
- `500 Internal Server Error`: Unhandled backend exception.

---

## 2. Authentication Domain (`/auth`)

### 2.1 Send OTP
Dispatches a 6-digit one-time password to the specified Indian mobile number. Enforces a 30-second cooldown per phone number.

- **Endpoint:** `POST /api/v1/auth/send-otp`
- **Auth:** Public
- **Rate Limit:** 3 requests per 10 minutes per IP/phone
- **Request Body:**
```json
{
  "phone": "+919876543210"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "phone": "+919876543210",
    "cooldownSeconds": 30,
    "expiresInSeconds": 300,
    "message": "Verification code dispatched via SMS."
  }
}
```
- **Curl Example:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```

---

### 2.2 Verify OTP
Verifies the 6-digit OTP code, sets or retrieves canonical user identity in Firestore (`users`), and issues a session token.

- **Endpoint:** `POST /api/v1/auth/verify-otp`
- **Auth:** Public
- **Request Body:**
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "SESSION_TOKEN_...",
    "isNewUser": true,
    "user": {
      "id": "c_919876543210",
      "phone": "+919876543210",
      "role": "crew"
    }
  }
}
```

---

### 2.3 Dev Login
Development and test harness authentication bypass.

- **Endpoint:** `POST /api/v1/auth/dev-login`
- **Auth:** Public (Enabled in non-production environments)
- **Request Body:**
```json
{
  "phone": "+919876543210",
  "role": "crew"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "DEV_TOKEN_+919876543210",
    "user": {
      "id": "c_919876543210",
      "phone": "+919876543210",
      "role": "crew"
    }
  }
}
```

---

## 3. Taxonomy Domain (`/taxonomy`)

### 3.1 Get Standardized Parent Roles
Returns all 10 canonical parent roles for Kerala audio-visual crafts.

- **Endpoint:** `GET /api/v1/taxonomy/roles`
- **Auth:** Public
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "id": "sound_engineer", "name": "Sound Engineer", "subroles": [...] },
    { "id": "lighting_designer", "name": "Lighting Designer", "subroles": [...] },
    { "id": "stage_manager", "name": "Stage Manager", "subroles": [...] },
    { "id": "cinematographer", "name": "Cinematographer", "subroles": [...] },
    { "id": "video_led_tech", "name": "Video / LED Tech", "subroles": [...] },
    { "id": "production_assistant", "name": "Production Assistant", "subroles": [...] },
    { "id": "rigging_trussing", "name": "Rigging & Trussing", "subroles": [...] },
    { "id": "post_production", "name": "Post-Production", "subroles": [...] },
    { "id": "camera_operator", "name": "Camera Operator", "subroles": [...] },
    { "id": "av_integrator", "name": "AV Integrator", "subroles": [...] }
  ]
}
```

---

### 3.2 Get Cities & Districts
Returns the 3 launch priority hubs and all 14 Kerala administrative districts.

- **Endpoint:** `GET /api/v1/taxonomy/cities`
- **Auth:** Public
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "launchCities": ["Kochi", "Thiruvananthapuram", "Kozhikode"],
    "districts": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"]
  }
}
```

---

## 4. Crew Domain (`/crew`)

### 4.1 30-Second Rapid Onboarding
Creates a live technician profile in under 30 seconds.

- **Endpoint:** `POST /api/v1/crew/onboard`
- **Auth:** Authenticated Crew (`Bearer <token>`)
- **Request Body:**
```json
{
  "name": "Manish Paul",
  "primaryRole": "sound_engineer",
  "roles": ["sound_engineer"],
  "city": "Kochi",
  "consentVersion": "1.0",
  "associationCode": "FEFKA-SND-1042"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "c_919876543210",
    "name": "Manish Paul",
    "primaryRole": "sound_engineer",
    "city": "Kochi",
    "approved": false,
    "availableNow": false,
    "completeness": 60
  }
}
```

---

### 4.2 Progressive Profile Update
Updates day rate, commercial visibility, travel radius, bio, and portfolio links.

- **Endpoint:** `PUT /api/v1/crew/profile`
- **Auth:** Authenticated Crew
- **Request Body:**
```json
{
  "dayRate": 4000,
  "showDayRate": true,
  "experience": "5-10 years",
  "travelRadius": "All Kerala",
  "bio": "Concert FOH mixer and live sound engineer with 8 years experience across Kerala festivals.",
  "portfolioUrl": "https://instagram.com/manish_sound"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "completeness": 90,
    "dayRate": 4000,
    "showDayRate": true
  }
}
```

---

### 4.3 Search Verified Crew
Enables event recruiters to search crew with parent role taxonomy, city filtering, and availability toggles.

- **Endpoint:** `GET /api/v1/crew/search`
- **Auth:** Authenticated Recruiter / Admin
- **Query Parameters:**
  - `role` (optional): E.g. `sound_engineer`
  - `city` (optional): E.g. `Kochi`
  - `availableOnly` (optional): `true` or `false`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "c_919876543210",
      "name": "Manish Paul",
      "primaryRole": "sound_engineer",
      "city": "Kochi",
      "availableNow": true,
      "showDayRate": true,
      "dayRate": 4000,
      "associationCode": "FEFKA-SND-1042"
    }
  ]
}
```

---

## 5. Availability Domain (`/availability`)

### 5.1 Toggle 18-Hour Ephemeral Availability
Activates or deactivates the 18-hour broadcast window with DPDP-compliant coarse location rounding (~1.1 km precision).

- **Endpoint:** `POST /api/v1/availability/toggle`
- **Auth:** Authenticated Crew
- **Request Body:**
```json
{
  "availableNow": true,
  "coarseLat": 9.93,
  "coarseLng": 76.26,
  "coarseCity": "Kochi"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "availableNow": true,
    "coarseCity": "Kochi",
    "coarseLat": 9.93,
    "coarseLng": 76.26,
    "expiresAt": "2026-11-10T18:00:00.000Z"
  }
}
```

---

## 6. Availability Inquiries Domain (`/requests`)

### 6.1 Create Availability Inquiry (Capped at 10 Candidate Pings)
Dispatches an availability request to matching candidates. Enforces an explicit 10-candidate ping cap per request.

- **Endpoint:** `POST /api/v1/requests`
- **Auth:** Authenticated Recruiter
- **Request Body:**
```json
{
  "projectTitle": "Cochin Music Fest 2026",
  "role": "sound_engineer",
  "startDate": "15/12/2026",
  "endDate": "16/12/2026",
  "location": "Kochi",
  "dayRateOffered": 4500,
  "notes": "FOH mixing for live indie band setup. 7 AM call time."
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "req_884920412",
    "projectTitle": "Cochin Music Fest 2026",
    "status": "pending",
    "pingsCount": 1,
    "candidates": [
      {
        "crewId": "c_919876543210",
        "name": "Manish Paul",
        "status": "pending"
      }
    ]
  }
}
```

---

### 6.2 Respond to Inquiry (YES / NO)
Crew member accepts or declines an inquiry. Responding YES discloses phone number to the recruiter for direct booking.

- **Endpoint:** `POST /api/v1/requests/:id/respond`
- **Auth:** Authenticated Crew
- **Request Body:**
```json
{
  "response": "YES"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "requestId": "req_884920412",
    "response": "YES",
    "contactShared": true
  }
}
```

---

### 6.3 Track Live Request Responses
Recruiter inspects candidate responses. Confirmed YES responses reveal direct phone numbers.

- **Endpoint:** `GET /api/v1/requests/:id`
- **Auth:** Authenticated Recruiter
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "req_884920412",
    "projectTitle": "Cochin Music Fest 2026",
    "candidates": [
      {
        "crewId": "c_919876543210",
        "name": "Manish Paul",
        "status": "accepted",
        "response": "YES",
        "phone": "+919876543210"
      }
    ]
  }
}
```

---

## 7. Account & DPDP Erasure Domain (`/account`)

### 7.1 Permanent Account & Data Deletion
Permanently erases user identity, crew/recruiter profiles, availability records, and notifications under the DPDP Act 2023.

- **Endpoint:** `DELETE /api/v1/account`
- **Auth:** Authenticated User (Crew or Recruiter)
- **Request Body:**
```json
{
  "reason": "Relocating outside Kerala"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "phone": "+919876543210",
    "erasedCollections": ["users", "crew", "availability", "notifications"],
    "message": "Account and all associated personal data permanently erased."
  }
}
```

---

## 8. Admin Moderation Domain (`/admin`)

### 8.1 Real Database Metrics
Returns real aggregated metrics derived directly from Firestore documents.

- **Endpoint:** `GET /api/v1/admin/metrics`
- **Auth:** Authenticated Super Admin
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalCrew": 142,
    "approvedCrew": 118,
    "pendingCrew": 24,
    "availableCrew": 16,
    "totalOrganizers": 38,
    "totalRequests": 54
  }
}
```

---

### 8.2 Approve Crew Profile
Approves a pending technician profile for public directory search indexing.

- **Endpoint:** `POST /api/v1/admin/approve`
- **Auth:** Authenticated Super Admin
- **Request Body:**
```json
{
  "crewId": "c_919876543210"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "c_919876543210",
    "approved": true
  }
}
```

---

### 8.3 Reject / Revoke Crew Profile
Rejects or revokes approval for a profile, removing it from search results.

- **Endpoint:** `POST /api/v1/admin/reject`
- **Auth:** Authenticated Super Admin
- **Request Body:**
```json
{
  "crewId": "c_919876543210",
  "reason": "Unverifiable guild membership"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "c_919876543210",
    "approved": false,
    "status": "rejected"
  }
}
```

