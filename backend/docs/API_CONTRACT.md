# CrewHive Shared API — Canonical Contract (v2, `/api/v1`)

One contract for the website and the mobile app. Source of truth for request validation: `packages/shared/src/schemas/index.js`. Machine-readable summary: `openapi.yaml` (generated from the route table; keep in sync with `routes/index.js`).

## Conventions
- **Auth:** `Authorization: Bearer <Firebase ID token>`. Obtained via OTP (`/auth/otp/verify` returns `idToken` + `refreshToken`; `customToken` is also returned for the web's Firebase SDK). Identity = digits-only phone (e.g. `919876543210`). Role/approval are read **server-side** from `users/{id}`; the client can never assert a role. Super-admins come only from `SUPER_ADMIN_PHONE`/`ADMIN_PHONES` env.
- **Success:** `{ "success": true, "data": {…}, "message": "…" }` (201 for creation).
- **Failure:** `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": {…} } }`. No stack traces or internals.
- **Codes:** 200/201 ok · 400 `VALIDATION_ERROR` · 401 `UNAUTHORIZED` (also revoked/deleted sessions) · 403 `FORBIDDEN` · 404 `NOT_FOUND` (also used instead of 403 for other users' requests, to avoid existence leaks) · 409 `CONFLICT` · 410 `EXPIRED` · 422 `BUSINESS_RULE_VIOLATION` · 429 `RATE_LIMITED` (+`Retry-After`) · 500 `INTERNAL_ERROR`.
- **Headers:** `X-Client: web|app` (recorded as response channel), `X-Device-Id` (OTP device limit), `X-Forwarded-For` honoured behind the proxy.
- **Roles:** stored as `crew`, `organizer` (= recruiter; legacy `employer` is normalised), `admin`, `super_admin`.
- **Limits:** OTP 30 s cooldown, 5 per phone / 15 min, 5 per device / 15 min, 20 per IP / 15 min, 5 wrong attempts per code; auth endpoints 30 / 15 min / IP; general 300 / min / IP; reports 10 / h; contact reveals 30 / h. Body limit 256 kB. CORS allow-list from `CORS_ORIGINS`.

## Endpoints
| Method | Path | Authentication | Authorization / validation |
|---|---|---|---|
| POST | `/api/v1/auth/otp/send` | Public | —; per-IP/device/phone limits; body `sendOtp` |
| POST | `/api/v1/auth/send-otp` | Public | —; alias of /auth/otp/send |
| POST | `/api/v1/auth/otp/verify` | Public | —; body `verifyOtp`; returns customToken+idToken+refreshToken |
| POST | `/api/v1/auth/verify-otp` | Public | —; alias |
| POST | `/api/v1/auth/refresh` | Public (refresh token) | —; body `refresh` |
| POST | `/api/v1/auth/logout` | Bearer token | —; revokes refresh tokens |
| GET | `/api/v1/auth/me` | Bearer token | —; role/approved/exists |
| POST | `/api/v1/crew/onboard` | Bearer token | —; body schema `crewOnboard` |
| GET | `/api/v1/crew/me` | Bearer token | crew |
| PATCH | `/api/v1/crew/me` | Bearer token | crew |
| GET | `/api/v1/crew/me/availability` | Bearer token | crew |
| PUT | `/api/v1/crew/me/availability` | Bearer token | crew; body schema `availability` |
| POST | `/api/v1/crew/me/location-consent/withdraw` | Bearer token | crew |
| GET | `/api/v1/crew/me/requests` | Bearer token | crew |
| POST | `/api/v1/crew/me/requests/:bookingId/respond` | Bearer token | crew; body schema `respond` |
| POST | `/api/v1/crew/me/association` | Bearer token | crew |
| GET | `/api/v1/crew` | Optional token | — |
| GET | `/api/v1/crew/:id` | Optional token | — |
| GET | `/api/v1/crew/:id/contact` | Bearer token | organizer (recruiter) |
| POST | `/api/v1/recruiters/onboard` | Bearer token | —; body schema `recruiterOnboard` |
| GET | `/api/v1/recruiters/me` | Bearer token | organizer (recruiter) |
| GET | `/api/v1/recruiters/me/shortlist` | Bearer token | organizer (recruiter) |
| PUT | `/api/v1/recruiters/me/shortlist/:crewId` | Bearer token | organizer (recruiter) |
| DELETE | `/api/v1/recruiters/me/shortlist/:crewId` | Bearer token | organizer (recruiter) |
| GET | `/api/v1/recruiters/me/shows` | Bearer token | organizer (recruiter) |
| POST | `/api/v1/recruiters/me/shows` | Bearer token | organizer (recruiter) |
| DELETE | `/api/v1/recruiters/me/shows/:id` | Bearer token | organizer (recruiter) |
| POST | `/api/v1/requests` | Bearer token | organizer (recruiter); body schema `createRequest` |
| GET | `/api/v1/requests` | Bearer token | organizer (recruiter) |
| GET | `/api/v1/requests/:id` | Bearer token | organizer (recruiter) |
| PATCH | `/api/v1/requests/:id` | Bearer token | organizer (recruiter) |
| GET | `/api/v1/notifications` | Bearer token | — |
| POST | `/api/v1/notifications/:id/read` | Bearer token | — |
| POST | `/api/v1/devices` | Bearer token | — |
| DELETE | `/api/v1/devices` | Bearer token | — |
| POST | `/api/v1/reports` | Bearer token | —; body schema `report` |
| GET | `/api/v1/blocks` | Bearer token | — |
| PUT | `/api/v1/blocks/:id` | Bearer token | — |
| DELETE | `/api/v1/blocks/:id` | Bearer token | — |
| DELETE | `/api/v1/account` | Bearer token | — |
| GET | `/api/v1/taxonomy/roles` | Public | — |
| GET | `/api/v1/taxonomy/cities` | Public | — |
| GET | `/api/v1/features` | Optional token | — |
| GET | `/api/v1/admin/profiles` | Bearer token | admin / super_admin |
| POST | `/api/v1/admin/profiles/:id/:action` | Bearer token | admin / super_admin |
| GET | `/api/v1/admin/metrics` | Bearer token | admin / super_admin |
| GET | `/api/v1/admin/reports` | Bearer token | admin / super_admin |
| POST | `/api/v1/admin/reports/:id/resolve` | Bearer token | admin / super_admin |
| POST | `/api/v1/admin/taxonomy/roles` | Bearer token | admin / super_admin |
| PUT | `/api/v1/admin/taxonomy/cities` | Bearer token | admin / super_admin |
| GET | `/api/v1/admin/associations` | Bearer token | admin / super_admin |
| POST | `/api/v1/admin/associations` | Bearer token | admin / super_admin |
| POST | `/api/v1/admin/associations/import` | Bearer token | admin / super_admin |
| PUT | `/api/v1/admin/features` | Bearer token | admin / super_admin |
| GET | `/api/v1/admin/users` | Bearer token | super_admin |
| PUT | `/api/v1/admin/users/:id/role` | Bearer token | super_admin |
| GET/POST | `/api/v1/whatsapp/webhook` | Handshake / HMAC signature | provider webhook |
| GET | `/health, /ready` | Public | liveness / Firebase readiness |

## Key request/response shapes
| Call | Request | Response `data` |
|---|---|---|
| `POST /auth/otp/send` | `{phone}` | `{cooldownSeconds, expiresInSeconds, delivered, channel}` (+`devOtp` only when `OTP_DEV_ECHO`/test) |
| `POST /auth/otp/verify` | `{phone, otp}` | `{customToken, idToken, refreshToken, expiresIn, user:{id,phone,role,approved,exists}, isNewUser}` |
| `POST /crew/onboard` | `{name, role, roles?, specialisations?, city, district?, consent:{termsAccepted,privacyAccepted,acceptableBehaviorAccepted,version?}}` | `{crew, created}` — account docs are created **here**, after consent |
| `PATCH /crew/me` | any of: name, city, district, experience, bio, profileImage, roles, specialisations, languages, ratePerDay, rateVisible, portfolioLinks{instagram,youtube,drive}, pastCredits[{eventName,role,year}], equipmentOwned[], travelWillingness(local\|district\|kerala), associationMembership{name} (verified flag ignored) | owner view + `profileCompleteness`, `nextStep` |
| `PUT /crew/me/availability` | `{available, coarseCity?, coarseCoords?{lat,lng}, consentGranted?}` | `{available, availableExpiresAt, locationLabel}` — expiry is **server-set (7 days)**; coords rounded to 2 dp |
| `GET /crew` | query: role, specialisation, city, language, experience, available, minRate, maxRate, page, limit | `{items:[public crew], pagination}` — public DTO: no phone, no coordinates, rate only if `rateVisible` |
| `POST /requests` | `{role, date(YYYY-MM-DD), location, workType, specialisation?, notes?, targetCrewIds?, responseWindowMinutes?}` | request + `pingsSent`, `deliveries` (max 10 pings, 3/day/crew, 2-min duplicate guard) |
| `GET /requests/:id` | — | request with `crewPings`; crew `phone` only for **accepted** pings; owner/admin only |
| `POST /crew/me/requests/:bookingId/respond` | `{response:"accepted"\|"declined"}` | `{status, respondedAt, responseChannel}`; 403 not yours, 409 duplicate, 410 expired |
| `DELETE /account` | — | `{deleted:true}`; erasure policy in `account.service.js` |

Database operations per endpoint: see `docs/migration/BACKEND_API_INVENTORY.md`.
