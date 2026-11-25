/**
 * CrewHive Professional Role Taxonomy
 * Centralized, immutable single source of truth for all 10 Parent AV & Event Domains
 * and 34 detailed specialisations with bilingual English/Malayalam metadata.
 */

export const PARENT_ROLES = [
  {
    id: "lighting",
    sortOrder: 1,
    name: "Lighting",
    nameEn: "Lighting",
    nameMl: "ലൈറ്റിംഗ്",
    icon: "Lightbulb",
    specialisations: [
      { id: "lighting_technician", parentRole: "lighting", name: "Lighting technician", nameEn: "Lighting technician", nameMl: "ലൈറ്റിംഗ് ടെക്നീഷ്യൻ" },
      { id: "lighting_designer", parentRole: "lighting", name: "Lighting designer", nameEn: "Lighting designer", nameMl: "ലൈറ്റിംഗ് ഡിസൈനർ" },
      { id: "gaffer", parentRole: "lighting", name: "Gaffer", nameEn: "Gaffer", nameMl: "ഗാഫർ" },
      { id: "console_operator", parentRole: "lighting", name: "Console operator", nameEn: "Console operator", nameMl: "കൺസോൾ ഓപ്പറേറ്റർ" },
    ],
    get subroles() { return this.specialisations; },
  },
  {
    id: "sound",
    sortOrder: 2,
    name: "Sound",
    nameEn: "Sound",
    nameMl: "സൗണ്ട്",
    icon: "Volume2",
    specialisations: [
      { id: "sound_engineer", parentRole: "sound", name: "Sound engineer", nameEn: "Sound engineer", nameMl: "സൗണ്ട് എഞ്ചിനീയർ" },
      { id: "foh_engineer", parentRole: "sound", name: "FOH engineer", nameEn: "FOH engineer", nameMl: "FOH എഞ്ചിനീയർ" },
      { id: "monitor_engineer", parentRole: "sound", name: "Monitor engineer", nameEn: "Monitor engineer", nameMl: "മോണിറ്റർ എഞ്ചിനീയർ" },
      { id: "boom_operator", parentRole: "sound", name: "Boom operator", nameEn: "Boom operator", nameMl: "ബൂം ഓപ്പറേറ്റർ" },
      { id: "sound_recordist", parentRole: "sound", name: "Sound recordist", nameEn: "Sound recordist", nameMl: "സൗണ്ട് റെക്കോർഡിസ്റ്റ്" },
    ],
    get subroles() { return this.specialisations; },
  },
  {
    id: "rigging",
    sortOrder: 3,
    name: "Rigging and staging",
    nameEn: "Rigging and staging",
    nameMl: "റിഗ്ഗിംഗും സ്റ്റേജിംഗും",
    icon: "Layers",
    specialisations: [
      { id: "rigger", parentRole: "rigging", name: "Rigger", nameEn: "Rigger", nameMl: "റിഗ്ഗർ" },
      { id: "truss_technician", parentRole: "rigging", name: "Truss technician", nameEn: "Truss technician", nameMl: "ട്രസ് ടെക്നീഷ്യൻ" },
      { id: "stage_technician", parentRole: "rigging", name: "Stage technician", nameEn: "Stage technician", nameMl: "സ്റ്റേജ് ടെക്നീഷ്യൻ" },
      { id: "stagehand", parentRole: "rigging", name: "Stagehand", nameEn: "Stagehand", nameMl: "സ്റ്റേജ്ഹാൻഡ്" },
    ],
    get subroles() { return this.specialisations; },
  },
  {
    id: "sfx",
    sortOrder: 4,
    name: "SFX",
    nameEn: "SFX",
    nameMl: "SFX (പ്രത്യേക ഇഫക്റ്റുകൾ)",
    icon: "Sparkles",
    specialisations: [
      { id: "sfx_technician", parentRole: "sfx", name: "SFX technician", nameEn: "SFX technician", nameMl: "SFX ടെക്നീഷ്യൻ" },
      { id: "pyro_operator", parentRole: "sfx", name: "Pyro/effects operator", nameEn: "Pyro/effects operator", nameMl: "പൈറോ/ഇഫക്ട്സ് ഓപ്പറേറ്റർ" },
    ],
    get subroles() { return this.specialisations; },
  },
  {
    id: "camera",
    sortOrder: 5,
    name: "Camera",
    nameEn: "Camera",
    nameMl: "ക്യാമറ",
    icon: "Camera",
    specialisations: [
      { id: "dop", parentRole: "camera", name: "DOP", nameEn: "DOP", nameMl: "DOP (ഛായാഗ്രാഹകൻ)" },
      { id: "camera_operator", parentRole: "camera", name: "Camera operator", nameEn: "Camera operator", nameMl: "ക്യാമറ ഓപ്പറേറ്റർ" },
      { id: "focus_puller", parentRole: "camera", name: "Focus puller", nameEn: "Focus puller", nameMl: "ഫോക്കസ് പുള്ളർ" },
      { id: "drone_operator", parentRole: "camera", name: "Drone operator", nameEn: "Drone operator", nameMl: "ഡ്രോൺ ഓപ്പറേറ്റർ" },
      { id: "dit", parentRole: "camera", name: "DIT", nameEn: "DIT", nameMl: "DIT (ഡിജിറ്റൽ ഇമേജിംഗ് ടെക്നീഷ്യൻ)" },
    ],
    get subroles() { return this.specialisations; },
  },
  {
    id: "direction",
    sortOrder: 6,
    name: "Direction and production",
    nameEn: "Direction and production",
    nameMl: "സംവിധാനവും പ്രൊഡക്ഷനും",
    icon: "Clapperboard",
    specialisations: [
      { id: "first_ad", parentRole: "direction", name: "First AD", nameEn: "First AD", nameMl: "ഫസ്റ്റ് എ.ഡി" },
      { id: "assistant_director", parentRole: "direction", name: "Assistant director", nameEn: "Assistant director", nameMl: "അസിസ്റ്റന്റ് ഡയറക്ടർ" },
      { id: "production_manager", parentRole: "direction", name: "Production manager", nameEn: "Production manager", nameMl: "പ്രൊഡക്ഷൻ മാനേജർ" },
      { id: "stage_manager", parentRole: "direction", name: "Stage manager", nameEn: "Stage manager", nameMl: "സ്റ്റേജ് മാനേജർ" },
    ],
    get subroles() { return this.specialisations; },
  },
  {
    id: "art_set",
    sortOrder: 7,
    name: "Art and set",
    nameEn: "Art and set",
    nameMl: "ആർട്ടും സെറ്റും",
    icon: "Palette",
    specialisations: [
      { id: "art_assistant", parentRole: "art_set", name: "Art assistant", nameEn: "Art assistant", nameMl: "ആർട്ട് അസിസ്റ്റന്റ്" },
      { id: "set_builder", parentRole: "art_set", name: "Set builder", nameEn: "Set builder", nameMl: "സെറ്റ് ബിൽഡർ" },
      { id: "background_crew", parentRole: "art_set", name: "Background crew", nameEn: "Background crew", nameMl: "ബാക്ക്ഗ്രൗണ്ട് ക്രൂ" },
      { id: "props", parentRole: "art_set", name: "Props", nameEn: "Props", nameMl: "പ്രോപ്സ്" },
    ],
    get subroles() { return this.specialisations; },
  },
  {
    id: "photo_video",
    sortOrder: 8,
    name: "Photo and video",
    nameEn: "Photo and video",
    nameMl: "ഫോട്ടോയും വീഡിയോയും",
    icon: "Video",
    specialisations: [
      { id: "event_photographer", parentRole: "photo_video", name: "Event photographer", nameEn: "Event photographer", nameMl: "ഇവന്റ് ഫോട്ടോഗ്രാഫർ" },
      { id: "videographer", parentRole: "photo_video", name: "Videographer", nameEn: "Videographer", nameMl: "വീഡിയോഗ്രാഫർ" },
      { id: "livestream_operator", parentRole: "photo_video", name: "Live-stream operator", nameEn: "Live-stream operator", nameMl: "ലൈവ്-സ്ട്രീം ഓപ്പറേറ്റർ" },
      { id: "video_switcher", parentRole: "photo_video", name: "Video switcher", nameEn: "Video switcher", nameMl: "വീഡിയോ സ്വിച്ചർ" },
    ],
    get subroles() { return this.specialisations; },
  },
  {
    id: "post",
    sortOrder: 9,
    name: "Post",
    nameEn: "Post",
    nameMl: "പോസ്റ്റ് പ്രൊഡക്ഷൻ",
    icon: "Film",
    specialisations: [
      { id: "editor", parentRole: "post", name: "Editor", nameEn: "Editor", nameMl: "എഡിറ്റർ" },
      { id: "colourist", parentRole: "post", name: "Colourist", nameEn: "Colourist", nameMl: "കളറിസ്റ്റ്" },
      { id: "sound_designer", parentRole: "post", name: "Sound designer", nameEn: "Sound designer", nameMl: "സൗണ്ട് ഡിസൈനർ" },
    ],
    get subroles() { return this.specialisations; },
  },
  {
    id: "led_video",
    sortOrder: 10,
    name: "LED and video walls",
    nameEn: "LED and video walls",
    nameMl: "LED & വീഡിയോ വാൾസ്",
    icon: "Monitor",
    specialisations: [
      { id: "led_wall_technician", parentRole: "led_video", name: "LED wall technician", nameEn: "LED wall technician", nameMl: "LED വാൾ ടെക്നീഷ്യൻ" },
      { id: "media_server_operator", parentRole: "led_video", name: "Media server operator", nameEn: "Media server operator", nameMl: "മീഡിയ സെർവർ ഓപ്പറേറ്റർ" },
    ],
    get subroles() { return this.specialisations; },
  },
];

export function getParentRoleById(id) {
  if (!id) return null;
  return PARENT_ROLES.find((role) => role.id.toLowerCase() === id.toLowerCase()) || null;
}

export const findParentRole = getParentRoleById;

export function getSpecialisationById(id) {
  if (!id) return null;
  for (const role of PARENT_ROLES) {
    const spec = role.specialisations.find((s) => s.id.toLowerCase() === id.toLowerCase());
    if (spec) return spec;
  }
  return null;
}

export function getAllSpecialisationIds() {
  const ids = [];
  for (const role of PARENT_ROLES) {
    for (const spec of role.specialisations) {
      ids.push(spec.id);
    }
  }
  return ids;
}

export function findRoleOrSpecialisation(identifier, language = "en") {
  if (!identifier) return null;
  const target = identifier.toLowerCase().trim();

  for (const role of PARENT_ROLES) {
    if (
      role.id.toLowerCase() === target ||
      role.nameEn.toLowerCase() === target ||
      role.nameMl.toLowerCase() === target
    ) {
      return { type: "parent", role, label: language === "ml" ? role.nameMl : role.nameEn };
    }

    for (const spec of role.specialisations) {
      if (
        spec.id.toLowerCase() === target ||
        spec.nameEn.toLowerCase() === target ||
        spec.nameMl.toLowerCase() === target
      ) {
        return {
          type: "specialisation",
          parentRole: role,
          specialisation: spec,
          label: language === "ml" ? spec.nameMl : spec.nameEn,
        };
      }
    }
  }
  return null;
}

export default {
  PARENT_ROLES,
  getParentRoleById,
  getSpecialisationById,
  getAllSpecialisationIds,
  findRoleOrSpecialisation,
};

