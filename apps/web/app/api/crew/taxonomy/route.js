import { NextResponse } from "next/server";
import {
  PARENT_ROLES,
  CITIES,
  EXPERIENCE_RANGES,
  TRAVEL_WILLINGNESS,
  LANGUAGES_LIST,
  EQUIPMENT_CATEGORIES,
  CURRENT_CONSENT_VERSION,
} from "@/utils/taxonomy";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      roles: PARENT_ROLES,
      cities: CITIES,
      experienceRanges: EXPERIENCE_RANGES,
      travelOptions: TRAVEL_WILLINGNESS,
      languages: LANGUAGES_LIST,
      equipmentCategories: EQUIPMENT_CATEGORIES,
      consentVersion: CURRENT_CONSENT_VERSION,
    },
  });
}
