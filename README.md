# CrewHive — Production Setup Guide

CrewHive is a WhatsApp-first crew hiring platform for the Kerala media industry.  
Users onboard via WhatsApp chatbot (MSG91), admins approve, then users log in via Firebase Phone OTP.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS |
| Auth | Firebase Authentication — Phone OTP |
| Database | Firestore |
| WhatsApp | MSG91 WhatsApp Business API |
| Deploy | Vercel |

---

## 1 — Environment Variables

Copy `.env.example` → `.env` and fill in all values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

MSG91_AUTH_KEY=
MSG91_WHATSAPP_NUMBER=

ADMIN_PHONES=+91XXXXXXXXXX

NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

## 2 — Enable Firebase Phone Authentication

This is the most critical setup step. Without it, OTP will not work.

### Step 1 — Open Firebase Console

Go to: **https://console.firebase.google.com**  
Select your project → **Authentication** (left sidebar)

### Step 2 — Enable Phone sign-in

1. Click **Sign-in method** tab
2. Find **Phone** in the provider list
3. Click the row → toggle **Enable** → click **Save**

![Phone Auth Enable](https://firebase.google.com/images/brand-guidelines/logo-logomark.png)

### Step 3 — Add Authorized Domains

Still in Authentication → click **Settings** tab → **Authorized domains**

Add both:
- `localhost`
- `your-project.vercel.app` (your production domain)

> Without this, reCAPTCHA will fail with `auth/unauthorized-domain`

### Step 4 — Firebase Blaze Plan (required for real SMS)

Firebase Phone Auth sends real SMS only on the **Blaze (pay-as-you-go)** plan.

1. In Firebase Console → click ⚙️ **Project Settings** → **Usage and billing**
2. Click **Modify plan** → select **Blaze**
3. Set a budget alert (recommended: $5/month to avoid surprise charges)

> **Free tier includes 10,000 SMS/month** after upgrade — more than enough for early stage.

### Step 5 — (Optional) Add test phone numbers for local dev

To avoid SMS charges during development:

1. Authentication → Sign-in method → scroll to **Phone numbers for testing**
2. Click **Add phone number**
3. Enter: `+91 7000000000` → OTP: `123456`
4. Click **Add** → **Save**

You can now use `+917000000000` with OTP `123456` locally without being charged.

---

## 3 — MSG91 WhatsApp Setup

### Step 1 — Get Auth Key

1. Log into **https://control.msg91.com**
2. Top-right → **Profile** → **API** → copy your **Auth Key**
3. Add to `.env`: `MSG91_AUTH_KEY=<your_key>`

### Step 2 — Register WhatsApp Business Number

1. MSG91 Dashboard → **WhatsApp** → **Integrated Numbers**
2. Find your active number (e.g. `918139002826`)
3. Add to `.env`: `MSG91_WHATSAPP_NUMBER=+918139002826`

### Step 3 — Register the Webhook

1. MSG91 Dashboard → **WhatsApp** → **Webhook**
2. Set webhook URL: `https://your-domain.vercel.app/api/whatsapp/webhook`
3. Save

### Step 4 — Verify Webhook

Visit in browser:
```
https://your-domain.vercel.app/api/whatsapp/webhook
```
You should see: `{"status":"CrewHive WhatsApp Webhook active"}`

---

## 4 — Local Development

```bash
npm install
npm run dev
```

App runs at **http://localhost:3000**

---

## 5 — Complete User Flow

```
1. User sends "Hi" to your WhatsApp number
        ↓
2. MSG91 webhook → /api/whatsapp/webhook
        ↓
3. Conversation engine asks: role? name? city? experience?
        ↓
4. Profile saved to Firestore: users/{phoneDigits}
        ↓
5. Admin logs in → /admin → approves crew
        ↓
6. User visits /auth/phone → enters phone → receives SMS OTP
        ↓
7. User enters OTP → verified → redirected to dashboard
```

---

## 6 — Role-Based Redirects After Login

| Role | Approved | Redirects to |
|---|---|---|
| `admin` | — | `/admin` |
| `super_admin` | — | `/super-admin/dashboard` |
| `crew` | ✅ | `/crew/dashboard` |
| `crew` | ❌ | `/crew/verify` (pending screen) |
| `employer` | ✅ | `/employer/dashboard` |
| `employer` | ❌ | `/crew/verify` (pending screen) |
| no role yet | — | `/crew/setup` |

---

## 7 — Deploy to Vercel

```bash
git push origin main
```

Then in **Vercel Dashboard → Project → Settings → Environment Variables**, add all variables from your `.env` file.

> **Important:** After adding env vars, redeploy (Vercel does not auto-redeploy on env changes).

---

## 8 — Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `Phone sign-in is not enabled` | Phone provider not enabled in Firebase | See Section 2, Step 2 |
| `auth/unauthorized-domain` | Domain not in Firebase Authorized Domains | See Section 2, Step 3 |
| `auth/billing-not-enabled` | Project on Spark (free) plan | Upgrade to Blaze — Section 2, Step 4 |
| `auth/too-many-requests` | Rate limited | Wait 1–2 hours |
| `auth/invalid-phone-number` | Wrong format | Use E.164: `+919876543210` |
| MSG91 `401 Unauthorized` | Wrong auth key | Check MSG91 dashboard for correct key |
| Webhook `No "from" found` | MSG91 payload structure change | Check Vercel logs for full body |

---

## 9 — File Structure

```
lib/
  firebase.js       — Firebase app init (auth, db)
  auth.js           — sendOtp(), verifyOtp(), fetchUserRole()
  firestore.js      — Firestore CRUD helpers
  conversation.js   — WhatsApp conversation state machine
  whatsapp.js       — MSG91 API calls
  logger.js         — Dev-only log gating

app/
  login/page.js             — Main login page
  auth/phone/page.js        — Alt phone entry (same flow)
  auth/verify-otp/page.js   — OTP verification
  admin/page.js             — Admin approval dashboard
  crew/dashboard/page.js    — Crew dashboard
  employer/dashboard/page.js — Employer dashboard
  api/whatsapp/webhook/     — MSG91 incoming message handler
  api/auth/initialize/      — Post-OTP role resolver
```
