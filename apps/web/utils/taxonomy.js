/**
 * Taxonomy & Reference Data for CrewHive
 * Centralized source of truth for Roles, Specialisations, Cities, and Completeness.
 * Supports both English and Malayalam labels.
 */

export const CURRENT_CONSENT_VERSION = "1.0";

export const PARENT_ROLES = [
  {
    id: "lighting",
    sortOrder: 1,
    nameEn: "Lighting",
    nameMl: "ലൈറ്റിംഗ്",
    icon: "Lightbulb",
    specialisations: [
      { id: "lighting_technician", nameEn: "Lighting technician", nameMl: "ലൈറ്റിംഗ് ടെക്നീഷ്യൻ" },
      { id: "lighting_designer", nameEn: "Lighting designer", nameMl: "ലൈറ്റിംഗ് ഡിസൈനർ" },
      { id: "gaffer", nameEn: "Gaffer", nameMl: "ഗാഫർ" },
      { id: "console_operator", nameEn: "Console operator", nameMl: "കൺസോൾ ഓപ്പറേറ്റർ" },
    ],
  },
  {
    id: "sound",
    sortOrder: 2,
    nameEn: "Sound",
    nameMl: "സൗണ്ട്",
    icon: "Volume2",
    specialisations: [
      { id: "sound_engineer", nameEn: "Sound engineer", nameMl: "സൗണ്ട് എഞ്ചിനീയർ" },
      { id: "foh_engineer", nameEn: "FOH engineer", nameMl: "FOH എഞ്ചിനീയർ" },
      { id: "monitor_engineer", nameEn: "Monitor engineer", nameMl: "മോണിറ്റർ എഞ്ചിനീയർ" },
      { id: "boom_operator", nameEn: "Boom operator", nameMl: "ബൂം ഓപ്പറേറ്റർ" },
      { id: "sound_recordist", nameEn: "Sound recordist", nameMl: "സൗണ്ട് റെക്കോർഡിസ്റ്റ്" },
    ],
  },
  {
    id: "rigging",
    sortOrder: 3,
    nameEn: "Rigging and staging",
    nameMl: "റിഗ്ഗിംഗും സ്റ്റേജിംഗും",
    icon: "Boxes",
    specialisations: [
      { id: "rigger", nameEn: "Rigger", nameMl: "റിഗ്ഗർ" },
      { id: "truss_technician", nameEn: "Truss technician", nameMl: "ട്രസ്സ് ടെക്നീഷ്യൻ" },
      { id: "stage_technician", nameEn: "Stage technician", nameMl: "സ്റ്റേജ് ടെക്നീഷ്യൻ" },
      { id: "stagehand", nameEn: "Stagehand", nameMl: "സ്റ്റേജ് ഹാൻഡ്" },
    ],
  },
  {
    id: "sfx",
    sortOrder: 4,
    nameEn: "SFX",
    nameMl: "എസ്.എഫ്.എക്സ് (SFX)",
    icon: "Flame",
    specialisations: [
      { id: "sfx_technician", nameEn: "SFX technician", nameMl: "SFX ടെക്നീഷ്യൻ" },
      { id: "pyro_operator", nameEn: "Pyro/effects operator", nameMl: "പൈറോ / ഇഫക്റ്റ്സ് ഓപ്പറേറ്റർ" },
    ],
  },
  {
    id: "camera",
    sortOrder: 5,
    nameEn: "Camera",
    nameMl: "ക്യാമറ",
    icon: "Camera",
    specialisations: [
      { id: "dop", nameEn: "DOP", nameMl: "ഛായാഗ്രാഹകൻ (DOP)" },
      { id: "camera_operator", nameEn: "Camera operator", nameMl: "ക്യാമറ ഓപ്പറേറ്റർ" },
      { id: "focus_puller", nameEn: "Focus puller", nameMl: "ഫോക്കസ് പുള്ളർ" },
      { id: "drone_operator", nameEn: "Drone operator", nameMl: "ഡ്രോൺ ഓപ്പറേറ്റർ" },
      { id: "dit", nameEn: "DIT", nameMl: "ഡി.ഐ.ടി (DIT)" },
    ],
  },
  {
    id: "direction_production",
    sortOrder: 6,
    nameEn: "Direction and production",
    nameMl: "സംവിധാനവും പ്രൊഡക്ഷനും",
    icon: "Clapperboard",
    specialisations: [
      { id: "first_ad", nameEn: "First AD", nameMl: "ഫസ്റ്റ് എ.ഡി" },
      { id: "assistant_director", nameEn: "Assistant director", nameMl: "അസിസ്റ്റന്റ് ഡയറക്ടർ" },
      { id: "production_manager", nameEn: "Production manager", nameMl: "പ്രൊഡക്ഷൻ മാനേജർ" },
      { id: "stage_manager", nameEn: "Stage manager", nameMl: "സ്റ്റേജ് മാനേജർ" },
    ],
  },
  {
    id: "art_set",
    sortOrder: 7,
    nameEn: "Art and set",
    nameMl: "ആർട്ടും സെറ്റും",
    icon: "Palette",
    specialisations: [
      { id: "art_assistant", nameEn: "Art assistant", nameMl: "ആർട്ട് അസിസ്റ്റന്റ്" },
      { id: "set_builder", nameEn: "Set builder", nameMl: "സെറ്റ് ബിൽഡർ" },
      { id: "background_crew", nameEn: "Background crew", nameMl: "ബാക്ക്ഗ്രൗണ്ട് ക്രൂ" },
      { id: "props", nameEn: "Props", nameMl: "പ്രോപ്സ് അസിസ്റ്റന്റ്" },
    ],
  },
  {
    id: "photo_video",
    sortOrder: 8,
    nameEn: "Photo and video",
    nameMl: "ഫോട്ടോയും വീഡിയോയും",
    icon: "Video",
    specialisations: [
      { id: "event_photographer", nameEn: "Event photographer", nameMl: "ഇവന്റ് ഫോട്ടോഗ്രാഫർ" },
      { id: "videographer", nameEn: "Videographer", nameMl: "വീഡിയോഗ്രാഫർ" },
      { id: "livestream_operator", nameEn: "Live-stream operator", nameMl: "ലൈവ് സ്ട്രീം ഓപ്പറേറ്റർ" },
      { id: "video_switcher", nameEn: "Video switcher", nameMl: "വീഡിയോ സ്വിച്ചർ" },
    ],
  },
  {
    id: "post",
    sortOrder: 9,
    nameEn: "Post",
    nameMl: "പോസ്റ്റ് പ്രൊഡക്ഷൻ",
    icon: "Sliders",
    specialisations: [
      { id: "editor", nameEn: "Editor", nameMl: "എഡിറ്റർ" },
      { id: "colourist", nameEn: "Colourist", nameMl: "കളറിസ്റ്റ്" },
      { id: "sound_designer", nameEn: "Sound designer", nameMl: "സൗണ്ട് ഡിസൈനർ" },
    ],
  },
  {
    id: "led_video_walls",
    sortOrder: 10,
    nameEn: "LED and video walls",
    nameMl: "എൽ.ഇ.ഡി & വീഡിയോ വാൾ",
    icon: "Tv",
    specialisations: [
      { id: "led_wall_technician", nameEn: "LED wall technician", nameMl: "LED വാൾ ടെക്നീഷ്യൻ" },
      { id: "media_server_operator", nameEn: "Media server operator", nameMl: "മീഡിയ സെർവർ ഓപ്പറേറ്റർ" },
    ],
  },
];

export const CITIES = [
  { id: "kochi", nameEn: "Kochi", nameMl: "കൊച്ചി", isLaunchCity: true },
  { id: "thiruvananthapuram", nameEn: "Thiruvananthapuram", nameMl: "തിരുവനന്തപുരം", isLaunchCity: true },
  { id: "kozhikode", nameEn: "Kozhikode", nameMl: "കോഴിക്കോട്", isLaunchCity: true },
  { id: "thrissur", nameEn: "Thrissur", nameMl: "തൃശ്ശൂർ", isLaunchCity: false },
  { id: "kannur", nameEn: "Kannur", nameMl: "കണ്ണൂർ", isLaunchCity: false },
  { id: "kottayam", nameEn: "Kottayam", nameMl: "കോട്ടയം", isLaunchCity: false },
  { id: "malappuram", nameEn: "Malappuram", nameMl: "മലപ്പുറം", isLaunchCity: false },
  { id: "palakkad", nameEn: "Palakkad", nameMl: "പാലക്കാട്", isLaunchCity: false },
  { id: "alappuzha", nameEn: "Alappuzha", nameMl: "ആലപ്പുഴ", isLaunchCity: false },
  { id: "kollam", nameEn: "Kollam", nameMl: "കൊല്ലം", isLaunchCity: false },
  { id: "idukki", nameEn: "Idukki", nameMl: "ഇടുക്കി", isLaunchCity: false },
  { id: "kasaragod", nameEn: "Kasaragod", nameMl: "കാസർഗോഡ്", isLaunchCity: false },
  { id: "pathanamthitta", nameEn: "Pathanamthitta", nameMl: "പത്തനംതിട്ട", isLaunchCity: false },
  { id: "wayanad", nameEn: "Wayanad", nameMl: "വയനാട്", isLaunchCity: false },
];

export const EXPERIENCE_RANGES = [
  { id: "0-2", labelEn: "0–2 years", labelMl: "0–2 വർഷം" },
  { id: "3-5", labelEn: "3–5 years", labelMl: "3–5 വർഷം" },
  { id: "5-10", labelEn: "5–10 years", labelMl: "5–10 വർഷം" },
  { id: "10+", labelEn: "10+ years", labelMl: "10+ വർഷം" },
];

export const TRAVEL_WILLINGNESS = [
  { id: "local", labelEn: "Local only", labelMl: "സ്വന്തം നഗരത്തിൽ മാത്രം" },
  { id: "district", labelEn: "Within district", labelMl: "ജില്ലയ്ക്കുള്ളിൽ" },
  { id: "kerala", labelEn: "Anywhere in Kerala", labelMl: "കേരളത്തിലുടനീളം" },
];

export const LANGUAGES_LIST = [
  { id: "ml", labelEn: "Malayalam", labelMl: "മലയാളം" },
  { id: "en", labelEn: "English", labelMl: "ഇംഗ്ലീഷ്" },
  { id: "ta", labelEn: "Tamil", labelMl: "തമിഴ്" },
  { id: "hi", labelEn: "Hindi", labelMl: "ഹിന്ദി" },
  { id: "other", labelEn: "Other", labelMl: "മറ്റുള്ളവ" },
];

export const EQUIPMENT_CATEGORIES = [
  { id: "lighting", labelEn: "Lighting Equipment", labelMl: "ലൈറ്റിംഗ് ഉപകരണങ്ങൾ" },
  { id: "audio", labelEn: "Audio / Sound Gear", labelMl: "ഓഡിയോ ഉപകരണങ്ങൾ" },
  { id: "rigging", labelEn: "Rigging & Trussing", labelMl: "റിഗ്ഗിംഗ് ഉപകരണങ്ങൾ" },
  { id: "camera", labelEn: "Camera, Lenses & Grip", labelMl: "ക്യാമറ & ഗ്രിപ്പ്" },
  { id: "video", labelEn: "Video Switchers & LED", labelMl: "വീഡിയോ & എൽ.ഇ.ഡി" },
  { id: "other", labelEn: "General Tools / Other", labelMl: "മറ്റ് ഉപകരണങ്ങൾ" },
];

/**
 * Consistent profile completeness weights:
 * Total: 100%
 * - Phone: 10%
 * - Name: 10%
 * - Role (or roles): 10%
 * - City: 10%
 * - Profile Image: 10%
 * - Experience: 10%
 * - Languages: 10%
 * - Day Rate: 10%
 * - Portfolio / Reel links: 10%
 * - Past Credits or Equipment: 10%
 */
export function calculateProfileCompleteness(profile = {}) {
  let score = 0;
  const missing = [];

  // Required signup fields (40%)
  if (profile.phone) {
    score += 10;
  } else {
    missing.push({ key: "phone", labelEn: "Phone number", labelMl: "ഫോൺ നമ്പർ", weight: 10 });
  }

  if (profile.name && String(profile.name).trim()) {
    score += 10;
  } else {
    missing.push({ key: "name", labelEn: "Full name", labelMl: "പേര്", weight: 10 });
  }

  const hasRole = Boolean(
    profile.role ||
    (Array.isArray(profile.roles) && profile.roles.length > 0) ||
    profile.crewRole
  );
  if (hasRole) {
    score += 10;
  } else {
    missing.push({ key: "role", labelEn: "Professional role", labelMl: "തൊഴിൽ വിഭാഗം", weight: 10 });
  }

  if (profile.city && String(profile.city).trim()) {
    score += 10;
  } else {
    missing.push({ key: "city", labelEn: "City / District", labelMl: "നഗരം / ജില്ല", weight: 10 });
  }

  // After signup fields (60%)
  if (profile.profileImage && String(profile.profileImage).trim()) {
    score += 10;
  } else {
    missing.push({ key: "profileImage", labelEn: "Profile photo", labelMl: "പ്രൊഫൈൽ ഫോട്ടോ", weight: 10 });
  }

  if (profile.experience && String(profile.experience).trim()) {
    score += 10;
  } else {
    missing.push({ key: "experience", labelEn: "Years of experience", labelMl: "തൊഴിൽ പരിചയം", weight: 10 });
  }

  const hasLanguages = Array.isArray(profile.languages)
    ? profile.languages.length > 0
    : Boolean(profile.languages);
  if (hasLanguages) {
    score += 10;
  } else {
    missing.push({ key: "languages", labelEn: "Languages known", labelMl: "അറിയാവുന്ന ഭാഷകൾ", weight: 10 });
  }

  if (profile.ratePerDay && Number(profile.ratePerDay) > 0) {
    score += 10;
  } else {
    missing.push({ key: "ratePerDay", labelEn: "Day rate", labelMl: "പ്രതിദിന വേതനം", weight: 10 });
  }

  const hasPortfolio = Boolean(
    (profile.portfolioLinks && Object.values(profile.portfolioLinks).some(Boolean)) ||
    profile.portfolio ||
    profile.portfolioLink
  );
  if (hasPortfolio) {
    score += 10;
  } else {
    missing.push({ key: "portfolio", labelEn: "Portfolio or Reel link", labelMl: "പോർട്ട്ഫോളിയോ / റീൽ ലിങ്ക്", weight: 10 });
  }

  const hasCreditsOrEquip = Boolean(
    (Array.isArray(profile.pastCredits) && profile.pastCredits.length > 0) ||
    (Array.isArray(profile.equipmentOwned) && profile.equipmentOwned.length > 0) ||
    (profile.equipment && String(profile.equipment).trim())
  );
  if (hasCreditsOrEquip) {
    score += 10;
  } else {
    missing.push({ key: "creditsOrEquip", labelEn: "Past credits or equipment owned", labelMl: "മുൻകാല പ്രവർത്തി പരിചയം / ഉപകരണങ്ങൾ", weight: 10 });
  }

  // Next action recommendation
  let nextAction = null;
  if (missing.length > 0) {
    const firstMissing = missing[0];
    let actionTextEn = `Add your ${firstMissing.labelEn.toLowerCase()} to boost recruiter discovery.`;
    let actionTextMl = `റിക്രൂട്ടർമാർ കണ്ടെത്താൻ നിങ്ങളുടെ ${firstMissing.labelMl} ചേർക്കുക.`;

    if (firstMissing.key === "profileImage") {
      actionTextEn = "Add a profile photo to help recruiters recognize you.";
      actionTextMl = "റിക്രൂട്ടർമാർക്ക് തിരിച്ചറിയാൻ ഒരു പ്രൊഫൈൽ ഫോട്ടോ ചേർക്കുക.";
    } else if (firstMissing.key === "portfolio") {
      actionTextEn = "Add your portfolio to help recruiters discover your work.";
      actionTextMl = "നിങ്ങളുടെ വർക്കുകൾ കാണിക്കാൻ പോർട്ട്ഫോളിയോ ലിങ്കുകൾ ചേർക്കുക.";
    } else if (firstMissing.key === "ratePerDay") {
      actionTextEn = "Specify your day rate to receive relevant gig requests.";
      actionTextMl = "യോജിച്ച വർക്ക് ഓഫറുകൾ ലഭിക്കാൻ പ്രതിദിന വേതനം രേഖപ്പെടുത്തുക.";
    }

    nextAction = {
      field: firstMissing.key,
      textEn: actionTextEn,
      textMl: actionTextMl,
      link: "/crew/setup",
    };
  }

  return {
    percentage: Math.min(100, Math.max(0, score)),
    missingFields: missing,
    nextAction,
  };
}
