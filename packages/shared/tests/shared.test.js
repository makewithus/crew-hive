import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PARENT_ROLES,
  KERALA_DISTRICTS,
  isValidIndianPhone,
  normalizeIndianPhone,
  isValidOtp,
  calculateProfileCompleteness,
  phoneToDocId,
  getParentRoleById,
  findRoleOrSpecialisation,
} from "../src/index.js";

describe("@crew-hive/shared package unit tests", () => {
  it("exports all 10 parent roles", () => {
    assert.equal(PARENT_ROLES.length, 10);
    const lighting = getParentRoleById("lighting");
    assert.ok(lighting);
    assert.equal(lighting.nameEn, "Lighting");
    assert.equal(lighting.nameMl, "ലൈറ്റിംഗ്");
  });

  it("exports all 14 Kerala revenue districts", () => {
    assert.equal(KERALA_DISTRICTS.length, 14);
  });

  it("normalizes and validates Indian phone numbers correctly", () => {
    assert.equal(normalizeIndianPhone("9846012345"), "+919846012345");
    assert.equal(normalizeIndianPhone("09846012345"), "+919846012345");
    assert.equal(normalizeIndianPhone("+91 98460 12345"), "+919846012345");
    assert.equal(isValidIndianPhone("+919846012345"), true);
    assert.equal(isValidIndianPhone("12345"), false);
  });

  it("validates 6-digit numeric OTP", () => {
    assert.equal(isValidOtp("123456"), true);
    assert.equal(isValidOtp("12345"), false);
    assert.equal(isValidOtp("1234567"), false);
    assert.equal(isValidOtp("abcdef"), false);
  });

  it("computes profile completeness accurately", () => {
    const basic = {
      name: "Manu",
      phone: "+919846012345",
      role: "lighting",
      city: "Kochi",
    };
    assert.equal(calculateProfileCompleteness(basic), 50);

    const full = {
      ...basic,
      specialisations: ["lighting_technician"],
      experience: "3–5 years",
      dayRate: 3500,
      equipment: ["Console"],
      portfolio: "https://example.com/work",
    };
    assert.equal(calculateProfileCompleteness(full), 100);
  });

  it("generates deterministic Firestore document IDs", () => {
    assert.equal(phoneToDocId("+919846012345"), "919846012345");
    assert.equal(phoneToDocId("9846012345"), "919846012345");
  });

  it("finds bilingual roles and specialisations", () => {
    const res = findRoleOrSpecialisation("Gaffer", "ml");
    assert.ok(res);
    assert.equal(res.label, "ഗാഫർ");
  });
});

