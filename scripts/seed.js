/**
 * scripts/seed.js — Dev seed for CrewHive
 *
 * Creates test crew and organizer profiles directly in Firestore
 * using the Admin SDK so you can test the full app flow without WhatsApp.
 *
 * Usage:
 *   node scripts/seed.js
 *
 * After running:
 *   - Login with any seeded number at localhost:3000/login
 *   - Dev OTP is always 123456
 *   - Crew profiles start as PENDING — approve them from the super-admin portal
 *   - Organizer profiles are auto-approved and ready to use immediately
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Load .env manually (no dotenv dependency needed) ─────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const envVars = {};
try {
  readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length)
        envVars[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
    });
} catch {
  /* .env not found, rely on process.env */
}

const get = (key) => envVars[key] || process.env[key] || "";

// ─── Init Firebase Admin ──────────────────────────────────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: get("FIREBASE_ADMIN_PROJECT_ID"),
      clientEmail: get("FIREBASE_ADMIN_CLIENT_EMAIL"),
      privateKey: get("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();
const now = new Date().toISOString();
const phoneToDocId = (phone) => String(phone).replace(/\D/g, "");

// ─── Seed data ────────────────────────────────────────────────────────────────

const CREW_MEMBERS = [
  {
    phone: "+919876543201",
    name: "Arjun Nair",
    role: "Sound Engineer",
    experience: "3–5 years",
    city: "Kochi",
    travelRange: "100 km",
    ratePerDay: 2500,
    bio: "Experienced sound engineer specializing in live events and corporate shows.",
    available: true,
    portfolio: "",
    email: "",
  },
  {
    phone: "+919876543202",
    name: "Priya Menon",
    role: "Lighting Operator",
    experience: "5–10 years",
    city: "Trivandrum",
    travelRange: "150 km",
    ratePerDay: 3000,
    bio: "Creative lighting designer with 7+ years in stage productions and concerts.",
    available: true,
    portfolio: "",
    email: "priya@example.com",
  },
  {
    phone: "+919876543203",
    name: "Rahul Das",
    role: "Stage Manager",
    experience: "0–2 years",
    city: "Kozhikode",
    travelRange: "50 km",
    ratePerDay: 1800,
    bio: "Passionate stage manager eager to grow in the events industry.",
    available: false,
    portfolio: "",
    email: "",
  },
  {
    phone: "+919876543204",
    name: "Sneha Pillai",
    role: "LED Wall Tech",
    experience: "3–5 years",
    city: "Kochi",
    travelRange: "200 km",
    ratePerDay: 2800,
    bio: "LED wall setup and operation expert for large-scale events.",
    available: true,
    portfolio: "",
    email: "sneha@example.com",
  },
  {
    phone: "+919876543205",
    name: "Vishnu Kumar",
    role: "Rigger",
    experience: "10+ years",
    city: "Trivandrum",
    travelRange: "250 km",
    ratePerDay: 4000,
    bio: "Senior rigger with decade-long experience in arena concerts and expos.",
    available: true,
    portfolio: "",
    email: "",
  },
];

const ORGANIZERS = [
  {
    phone: "+919876543210",
    name: "Arun Events",
    company: "Arun Events & Productions",
    city: "Kochi",
    requirements: "Sound Engineer, Lighting Operator",
    whatsappPhone: "+919876543210",
  },
  {
    phone: "+919876543211",
    name: "Meera Krishnan",
    company: "MK Productions",
    city: "Trivandrum",
    requirements: "Stage Manager, LED Wall Tech",
    whatsappPhone: "+919876543211",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function upsert(collection, id, data) {
  await db.collection(collection).doc(id).set(data, { merge: true });
}

// ─── Seed crew ────────────────────────────────────────────────────────────────
async function seedCrew() {
  console.log("\n📋 Seeding crew members...");
  for (const member of CREW_MEMBERS) {
    const id = phoneToDocId(member.phone);

    // users collection — controls login + approval
    await upsert("users", id, {
      phone: member.phone,
      name: member.name,
      role: "crew",
      approved: false, // must be approved by admin before login is allowed
      createdAt: now,
      updatedAt: now,
    });

    // crew collection — full profile
    await upsert("crew", id, {
      id,
      phone: member.phone,
      name: member.name,
      role: member.role,
      experience: member.experience,
      city: member.city,
      travelRange: member.travelRange,
      ratePerDay: member.ratePerDay,
      bio: member.bio,
      available: member.available,
      portfolio: member.portfolio,
      email: member.email,
      status: "pending", // pending → approved by admin
      createdAt: now,
      updatedAt: now,
    });

    console.log(
      `  ✓ Crew: ${member.name} (${member.phone}) — PENDING approval`,
    );
  }
}

// ─── Seed organizers ──────────────────────────────────────────────────────────
async function seedOrganizers() {
  console.log("\n🏢 Seeding organizers...");
  for (const org of ORGANIZERS) {
    const id = phoneToDocId(org.phone);

    // users collection — organizers are always auto-approved
    await upsert("users", id, {
      phone: org.phone,
      name: org.name,
      company: org.company,
      city: org.city,
      role: "organizer",
      approved: true,
      createdAt: now,
      updatedAt: now,
    });

    // organizers collection — full profile (authoritative for role detection)
    await upsert("organizers", id, {
      id,
      phone: org.phone,
      name: org.name,
      company: org.company,
      city: org.city,
      requirements: org.requirements,
      whatsappPhone: org.whatsappPhone,
      role: "organizer",
      approved: true,
      status: "approved",
      createdAt: now,
      updatedAt: now,
    });

    console.log(
      `  ✓ Organizer: ${org.name} (${org.phone}) — APPROVED (ready to login)`,
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 CrewHive Dev Seed\n" + "─".repeat(50));
  console.log(`📡 Project: ${get("FIREBASE_ADMIN_PROJECT_ID")}`);

  await seedOrganizers();
  await seedCrew();

  console.log("\n" + "─".repeat(50));
  console.log("✅ Seed complete!\n");
  console.log("🔑 Dev OTP is always: 123456");
  console.log("🌐 Open: http://localhost:3000/login\n");

  console.log("ORGANIZERS (login ready):");
  ORGANIZERS.forEach((o) =>
    console.log(`  ${o.phone.replace("+91", "")}  →  Organizer portal`),
  );

  console.log("\nCREW (need admin approval first):");
  CREW_MEMBERS.forEach((c) =>
    console.log(`  ${c.phone.replace("+91", "")}  →  ${c.name} (${c.role})`),
  );

  console.log("\n📌 Steps:");
  console.log("  1. Login as super-admin → approve crew from admin portal");
  console.log("  2. Login with a crew number → crew dashboard");
  console.log("  3. Login with an organizer number → organizer dashboard");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
