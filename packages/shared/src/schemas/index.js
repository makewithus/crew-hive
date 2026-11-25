/**
 * @crew-hive/shared/schemas
 * Declarative request schemas + a tiny validator. These describe the canonical API contract for
 * BOTH clients; they contain NO business rules (the Express backend remains authoritative).
 *
 * Field spec: { type: "string"|"number"|"boolean"|"array"|"object", required?, min?, max?, enum?, pattern?, items? }
 */

const typeOk = (spec, v) =>
  spec.type === "array" ? Array.isArray(v)
  : spec.type === "object" ? v !== null && typeof v === "object" && !Array.isArray(v)
  : typeof v === spec.type;

/** @returns {{ok: boolean, value: object, errors: Record<string,string>}} unknown keys are dropped. */
export function validateSchema(schema, input) {
  const src = input && typeof input === "object" ? input : {};
  const value = {};
  const errors = {};
  for (const [key, spec] of Object.entries(schema)) {
    let v = src[key];
    if (v === undefined || v === null || v === "") {
      if (spec.required) errors[key] = "is required";
      continue;
    }
    if (spec.type === "string") v = String(v).trim();
    if (!typeOk(spec, v)) { errors[key] = `must be a ${spec.type}`; continue; }
    if (spec.enum && !spec.enum.includes(v)) { errors[key] = `must be one of: ${spec.enum.join(", ")}`; continue; }
    if (spec.pattern && !spec.pattern.test(v)) { errors[key] = "has an invalid format"; continue; }
    const size = spec.type === "string" || spec.type === "array" ? v.length : v;
    if (spec.min !== undefined && size < spec.min) { errors[key] = `must be at least ${spec.min}`; continue; }
    if (spec.max !== undefined && size > spec.max) { errors[key] = `must be at most ${spec.max}`; continue; }
    if (spec.type === "array" && spec.items && !v.every((x) => typeof x === spec.items)) { errors[key] = `items must be ${spec.items}`; continue; }
    value[key] = v;
  }
  return { ok: Object.keys(errors).length === 0, value, errors };
}

const PHONE = { type: "string", required: true, pattern: /^[+\d][\d\s-]{8,16}$/ };
const OTP = { type: "string", required: true, pattern: /^\d{6}$/ };

export const schemas = {
  sendOtp: { phone: PHONE },
  verifyOtp: { phone: PHONE, otp: OTP, deviceId: { type: "string", max: 128 } },
  firebaseLogin: { idToken: { type: "string", required: true } },
  refresh: { refreshToken: { type: "string", required: true } },
  consent: {
    version: { type: "string" },
    termsAccepted: { type: "boolean", required: true },
    privacyAccepted: { type: "boolean", required: true },
    acceptableBehaviorAccepted: { type: "boolean", required: true },
  },
  crewOnboard: {
    name: { type: "string", required: true, min: 2, max: 80 },
    role: { type: "string", required: true, max: 60 },
    roles: { type: "array", items: "string", max: 10 },
    specialisations: { type: "array", items: "string", max: 40 },
    city: { type: "string", required: true, min: 2, max: 80 },
    district: { type: "string", max: 80 },
    consent: { type: "object", required: true },
  },
  recruiterOnboard: {
    name: { type: "string", required: true, min: 2, max: 80 },
    companyName: { type: "string", max: 120 },
    city: { type: "string", required: true, min: 2, max: 80 },
    requirements: { type: "string", max: 500 },
    consent: { type: "object", required: true },
  },
  availability: {
    available: { type: "boolean", required: true },
    coarseCity: { type: "string", max: 80 },
    coarseCoords: { type: "object" },
    consentGranted: { type: "boolean" },
  },
  respond: { response: { type: "string", required: true, enum: ["accepted", "declined"] } },
  createRequest: {
    role: { type: "string", required: true, max: 60 },
    specialisation: { type: "string", max: 60 },
    date: { type: "string", required: true, pattern: /^\d{4}-\d{2}-\d{2}/ },
    location: { type: "string", required: true, max: 120 },
    workType: { type: "string", required: true, max: 60 },
    notes: { type: "string", max: 500 },
    targetCrewIds: { type: "array", items: "string", max: 10 },
    responseWindowMinutes: { type: "number", min: 5, max: 1440 },
  },
  report: {
    reportedProfileId: { type: "string", required: true },
    reason: { type: "string", required: true, max: 80 },
    details: { type: "string", max: 1000 },
  },
};

export default { validateSchema, schemas };
