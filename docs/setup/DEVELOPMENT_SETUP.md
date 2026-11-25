# CrewHive Monorepo — Developer Setup & Quickstart Guide

> **Target Audience**: Full-Stack Web Engineers, Mobile Engineers, QA Engineers, and DevOps  
> **Prerequisites**: Node.js `>= 20.18.0`, npm `>= 10.8.0`, Git  

---

## 1. Quickstart (Under 2 Minutes)

```bash
# 1. Clone the repository
git clone <repo-url>
cd CrewHive

# 2. Install dependencies across all monorepo workspaces
npm install

# 3. Verify all test suites
npm run test:all
```

---

## 2. Workspace Scripts Reference

The root `package.json` provides unified orchestration commands for all applications and packages:

| Command | Action | Target Workspace |
| :--- | :--- | :--- |
| `npm run dev:web` | Starts Next.js development server on `http://localhost:3000` | `apps/web` |
| `npm run dev:mobile` | Starts Expo Metro bundler with interactive QR code | `apps/mobile` |
| `npm run dev:api` | Starts Shared Express API service on `http://localhost:4000` | `services/api` |
| `npm run build:web` | Executes production Next.js build (SSR + Static generation) | `apps/web` |
| `npm run test:shared` | Executes unit tests for shared constants, taxonomy & validators | `packages/shared` |
| `npm run test:api` | Executes integration & health tests for shared Express backend | `services/api` |
| `npm run test:web` | Executes core crew onboarding & business logic test suite | `apps/web` |
| `npm run test:all` | Sequentially executes test suites across all workspaces | Whole Monorepo |
| `npm run verify:web` | Runs website compliance & banned-word elimination verification | `apps/web` |
| `npm run seed` | Seeds Firestore database with initial mock technician profiles | `apps/web` |

---

## 3. Environment Variable Configuration

Each application maintains its own isolated environment template:

### 3.1 Web Application (`apps/web/.env`)
Copy the example file:
```bash
cp apps/web/.env.example apps/web/.env
```
Fill in the credentials for:
- Firebase Web client credentials (`NEXT_PUBLIC_FIREBASE_*`)
- Cloudinary asset upload presets (`NEXT_PUBLIC_CLOUDINARY_*`)
- Firebase Admin SDK private key (Server-only: `FIREBASE_ADMIN_*`)
- MSG91 SMS & WhatsApp Auth Key (Server-only: `MSG91_*`)

### 3.2 Mobile Application (`apps/mobile/.env`)
Copy the example file:
```bash
cp apps/mobile/.env.example apps/mobile/.env
```
Configure safe public parameters with the `EXPO_PUBLIC_` prefix:
- `EXPO_PUBLIC_API_URL=http://localhost:3000/api`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id`
- `EXPO_PUBLIC_WHATSAPP_NUMBER=918139002826`

### 3.3 Express Backend Service (`services/api/.env`)
Copy the example file:
```bash
cp services/api/.env.example services/api/.env
```
Configure backend runtime settings:
- `PORT=4000`
- `NODE_ENV=development`
- `FIREBASE_ADMIN_*`

---

## 4. Running the Applications

### 4.1 Running the Website
```bash
npm run dev:web
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
- Homepage: `http://localhost:3000`
- 30-Second Crew Onboarding: `http://localhost:3000/crew/onboarding`
- Recruiter Discovery: `http://localhost:3000/organizer/search`
- Admin Center: `http://localhost:3000/admin`

### 4.2 Running the Mobile Application
```bash
npm run dev:mobile
```
- Press `a` in the terminal to launch the Android emulator.
- Press `i` to launch the iOS simulator.
- Scan the QR code using Expo Go on a physical device.

### 4.3 Running the Express Backend
```bash
npm run dev:api
```
Healthcheck endpoint: [http://localhost:4000/health](http://localhost:4000/health)

---

## 5. Firebase Rules Deployment

To deploy Firestore security rules without impacting application code:
```bash
firebase deploy --only firestore:rules
```
The root `firebase.json` automatically targets `firebase/firestore.rules`.

