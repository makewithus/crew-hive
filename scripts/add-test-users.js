import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envVars = {};
try {
  readFileSync(resolve(__dirname, '../.env'), 'utf8').split('\n').forEach((line) => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) envVars[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '');
  });
} catch { /* rely on process.env */ }
const get = (k) => envVars[k] || process.env[k] || '';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: get('FIREBASE_ADMIN_PROJECT_ID'),
      clientEmail: get('FIREBASE_ADMIN_CLIENT_EMAIL'),
      privateKey: get('FIREBASE_ADMIN_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

async function run() {
  const ts = new Date().toISOString();

  // Organizer: +918838514202
  const orgId = '918838514202';
  await db.collection('organizers').doc(orgId).set({
    id: orgId, phone: '+918838514202',
    name: 'Arjun Nair', company: 'Arjun Events',
    city: 'Kochi', email: '',
    createdAt: ts, updatedAt: ts,
  });
  await db.collection('users').doc(orgId).set({
    phone: '+918838514202', role: 'organizer', approved: true,
    name: 'Arjun Nair', createdAt: ts, updatedAt: ts,
  });
  console.log('Organizer added: +918838514202 (Arjun Nair)');

  // Crew: +917591929595
  const crewId = '917591929595';
  await db.collection('crew').doc(crewId).set({
    id: crewId, phone: '+917591929595',
    name: 'Rohan Menon', role: 'Sound Engineer',
    experience: '3-5 years', city: 'Trivandrum',
    travelRange: 100, ratePerDay: 2500,
    bio: 'Professional sound engineer with expertise in live events.',
    available: true, status: 'approved',
    createdAt: ts, updatedAt: ts,
  });
  await db.collection('users').doc(crewId).set({
    phone: '+917591929595', role: 'crew', approved: true,
    name: 'Rohan Menon', createdAt: ts, updatedAt: ts,
  });
  console.log('Crew added: +917591929595 (Rohan Menon)');
}

run().catch(console.error).finally(() => process.exit());
