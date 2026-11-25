/**
 * apps/mobile/src/components/common/AvIcons.js
 * Hardware-accurate, authentic Audio-Visual iconography and official brand marks.
 * Uses react-native-svg for crisp, vector-accurate rendering on all Android and iOS display densities.
 */

import React from "react";
import { View } from "react-native";
import Svg, { Path, Rect, Circle, Line, G } from "react-native-svg";
import { Colors } from "../../constants/theme.js";

/**
 * Official Indian National Flag (Tiranga) Vector Icon
 * Crisp tricolor (Saffron #FF9933, White #FFFFFF, India Green #138808) with Ashoka Chakra navy center.
 */
export function IndiaFlagIcon({ width = 22, height = 15 }) {
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 2.5,
        overflow: "hidden",
        borderWidth: 0.5,
        borderColor: "rgba(255, 255, 255, 0.25)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Svg width={width} height={height} viewBox="0 0 24 16" fill="none">
        {/* Top Saffron Band */}
        <Rect x="0" y="0" width="24" height="5.33" fill="#FF9933" />
        {/* Middle White Band */}
        <Rect x="0" y="5.33" width="24" height="5.34" fill="#FFFFFF" />
        {/* Bottom Green Band */}
        <Rect x="0" y="10.67" width="24" height="5.33" fill="#138808" />
        {/* Ashoka Chakra */}
        <Circle cx="12" cy="8" r="2.2" stroke="#000080" strokeWidth="0.6" fill="none" />
        <Circle cx="12" cy="8" r="0.6" fill="#000080" />
      </Svg>
    </View>
  );
}

/**
 * Official Authentic WhatsApp Brand Mark
 */
export function WhatsAppIcon({ size = 20, color = "#25D366" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        fill={color}
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </Svg>
  );
}

/**
 * 3-Channel Studio Console Fader
 */
export function ConsoleFaderIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Track 1 */}
      <Line x1="4" y1="2" x2="4" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Rect x="1" y="6" width="6" height="4" rx="1" fill={color} />

      {/* Track 2 */}
      <Line x1="12" y1="2" x2="12" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Rect x="9" y="14" width="6" height="4" rx="1" fill={color} />

      {/* Track 3 */}
      <Line x1="20" y1="2" x2="20" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Rect x="17" y="4" width="6" height="4" rx="1" fill={color} />
    </Svg>
  );
}

/**
 * Production Clapperboard Slate
 */
export function ProductionClapperIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="7" width="20" height="14" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M2 11H22" stroke={color} strokeWidth="2" />
      <Path d="M2 7L6 3H22L18 7H2Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Line x1="7" y1="3" x2="9" y2="7" stroke={color} strokeWidth="2" />
      <Line x1="13" y1="3" x2="15" y2="7" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

/**
 * Stage Lighting Fixture / PAR Can Icon
 */
export function StageLightIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2V5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M7 5H17" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M6 7L8 14H16L18 7H6Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Line x1="5" y1="18" x2="7" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="19" y1="18" x2="17" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="14" x2="12" y2="20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="12" cy="21" r="1.5" fill={color} />
    </Svg>
  );
}

/**
 * Stage Rigging Truss Icon
 */
export function RiggingTrussIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="6" width="18" height="12" rx="1.5" stroke={color} strokeWidth="2" />
      <Line x1="3" y1="6" x2="9" y2="18" stroke={color} strokeWidth="1.8" />
      <Line x1="9" y1="6" x2="15" y2="18" stroke={color} strokeWidth="1.8" />
      <Line x1="15" y1="6" x2="21" y2="18" stroke={color} strokeWidth="1.8" />
      <Line x1="9" y1="18" x2="15" y2="6" stroke={color} strokeWidth="1.8" />
      <Line x1="15" y1="18" x2="21" y2="6" stroke={color} strokeWidth="1.8" />
      <Line x1="3" y1="18" x2="9" y2="6" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

/**
 * SFX Pyrotechnics / Flame Icon
 */
export function FlameIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.5 14.5A3.5 3.5 0 0 0 12 18a3.5 3.5 0 0 0 3.5-3.5c0-1.5-1-2.5-1.5-3.5-.5-1-.5-2 0-3-2 1-3.5 3-3.5 5 0 .5.5 1 .5 1s-1-.5-1.5-1.5c-.5-1-.5-2.5 0-4-3 2-4.5 5.5-4.5 8.5 0 4.14 3.36 7.5 7.5 7.5s7.5-3.36 7.5-7.5c0-3.5-2-6-3.5-8-1-1.3-1.5-3-1-4.5C12.5 4 8 7.5 8 12c0 .9.2 1.7.5 2.5z"
        fill={color}
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Cinema & Broadcast Camera Icon
 */
export function CameraIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.5 4h-5L7.5 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3.5L14.5 4z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="14" r="4" stroke={color} strokeWidth="2" />
      <Circle cx="12" cy="14" r="1.5" fill={color} />
      <Circle cx="18" cy="10" r="1" fill={color} />
    </Svg>
  );
}

/**
 * Art & Set Design Palette Icon
 */
export function PaletteIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.5 2 2 6.5 2 12c0 4.4 2.8 8.1 6.8 9.4 1 .3 1.7-.5 1.7-1.4v-1.2c0-1 .8-1.8 1.8-1.8h2.2c4.1 0 7.5-3.4 7.5-7.5C22 5.6 17.5 2 12 2z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7.5" cy="8.5" r="1.5" fill={color} />
      <Circle cx="12" cy="6.5" r="1.5" fill={color} />
      <Circle cx="16.5" cy="8.5" r="1.5" fill={color} />
      <Circle cx="17.5" cy="13.5" r="1.5" fill={color} />
    </Svg>
  );
}

/**
 * Photo & Video Capture Icon
 */
export function PhotoVideoIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="6" width="14" height="12" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M16 10L22 6V18L16 14V10Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <Circle cx="9" cy="12" r="2.5" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

/**
 * Post-Production Sliders & Colour Wheels Icon
 */
export function SlidersIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="4" y1="21" x2="4" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="4" y1="10" x2="4" y2="3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="21" x2="12" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="8" x2="12" y2="3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="20" y1="21" x2="20" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="20" y1="12" x2="20" y2="3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="1" y1="14" x2="7" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="9" y1="8" x2="15" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="17" y1="16" x2="23" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * LED & Video Wall Matrix Display Icon
 */
export function LedScreenIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="3" width="20" height="14" rx="2" stroke={color} strokeWidth="2" />
      <Line x1="8.66" y1="3" x2="8.66" y2="17" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />
      <Line x1="15.33" y1="3" x2="15.33" y2="17" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />
      <Line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth="1.2" strokeOpacity="0.7" />
      <Path d="M8 21H16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

/**
 * Search Magnifying Glass
 */
export function SearchIcon({ size = 20, color = Colors.text.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M20 20L16 16" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Clock / Time
 */
export function ClockIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <Path d="M12 7V12L15 14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Map Pin / Location
 */
export function MapPinIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="9" r="2.5" fill={color} />
    </Svg>
  );
}

/**
 * Telephone Receiver
 */
export function PhoneIcon({ size = 20, color = Colors.text.primary }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92V19.92C22 20.48 21.54 20.94 20.98 20.92C18.12 20.61 15.42 19.65 13.06 18.17C10.92 16.83 9.08 14.99 7.74 12.85C6.25 10.48 5.29 7.78 4.98 4.92C4.96 4.36 5.42 3.9 5.98 3.9H8.98C9.48 3.9 9.9 4.26 9.97 4.75C10.1 5.67 10.33 6.57 10.66 7.42C10.79 7.76 10.71 8.14 10.44 8.41L9.17 9.68C10.35 11.75 12.06 13.46 14.13 14.64L15.4 13.37C15.67 13.1 16.05 13.02 16.39 13.15C17.24 13.48 18.14 13.71 19.06 13.84C19.56 13.91 19.92 14.34 19.92 14.84V16.92H22Z"
        fill={color}
      />
    </Svg>
  );
}

/**
 * Recruiter Briefcase
 */
export function BriefcaseIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="7" width="20" height="14" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M16 7V5C16 3.9 15.1 3 14 3H10C8.9 3 8 3.9 8 5V7" stroke={color} strokeWidth="2" />
      <Path d="M12 12V14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Settings Gear
 */
export function SettingsIcon({ size = 20, color = Colors.text.muted }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
      <Path
        d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L20.07 17.16A2 2 0 1 1 17.24 20L16.9 19.66A1.65 1.65 0 0 0 15.08 19.33A1.65 1.65 0 0 0 14 20.87V21.35A2 2 0 1 1 10 21.35V20.87A1.65 1.65 0 0 0 8.92 19.33A1.65 1.65 0 0 0 7.1 19.66L6.76 20A2 2 0 1 1 3.93 17.17L4.27 16.83A1.65 1.65 0 0 0 4.6 15.01A1.65 1.65 0 0 0 3.06 13.93H2.58A2 2 0 1 1 2.58 9.93H3.06A1.65 1.65 0 0 0 4.6 8.85A1.65 1.65 0 0 0 4.27 7.03L3.93 6.69A2 2 0 1 1 6.76 3.86L7.1 4.2A1.65 1.65 0 0 0 8.92 4.53A1.65 1.65 0 0 0 10 2.99V2.51A2 2 0 1 1 14 2.51V2.99A1.65 1.65 0 0 0 15.08 4.53A1.65 1.65 0 0 0 16.9 4.2L17.24 3.86A2 2 0 1 1 20.07 6.69L19.73 7.03A1.65 1.65 0 0 0 19.4 8.85A1.65 1.65 0 0 0 20.94 9.93H21.42A2 2 0 1 1 21.42 13.93H20.94A1.65 1.65 0 0 0 19.4 15Z"
        stroke={color}
        strokeWidth="1.8"
      />
    </Svg>
  );
}

/**
 * Bell / Inquiries Notification
 */
export function BellIcon({ size = 20, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M13.73 21A2 2 0 0 1 10.27 21" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Verified Guild / Shield Check
 */
export function ShieldCheckIcon({ size = 20, color = Colors.roles.association }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22S20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 12L11 14L15 10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Privacy / Lock
 */
export function LockIcon({ size = 18, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M7 11V7A5 5 0 0 1 17 7V11" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Caution / Irreversible Warning
 */
export function AlertTriangleIcon({ size = 20, color = Colors.semantic.error }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.29 3.86L1.82 18A2 2 0 0 0 3.53 21H20.47A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="17" r="1" fill={color} />
    </Svg>
  );
}

/**
 * Connection / Zap
 */
export function ZapIcon({ size = 18, color = Colors.accent.amber }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color}
        fillOpacity="0.25"
      />
    </Svg>
  );
}

/**
 * Checkmark / Verified
 */
export function CheckIcon({ size = 16, color = Colors.semantic.success }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17L4 12"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Decline / Cross
 */
export function XIcon({ size = 16, color = Colors.semantic.error }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * LogOut / SignOut Icon
 */
export function LogOutIcon({ size = 20, color = Colors.semantic.error }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 17l5-5-5-5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 12H9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * AV Craft Icon Resolver for 10-role taxonomy and specialisations
 */
export function getCraftIcon(roleId, { size = 24, color = Colors.accent.amber } = {}) {
  const normalized = String(roleId || "").toLowerCase().trim();
  switch (normalized) {
    case "lighting":
    case "lighting_technician":
    case "lighting_designer":
    case "gaffer":
    case "console_operator":
      return <StageLightIcon size={size} color={color} />;

    case "sound":
    case "sound_engineer":
    case "foh_engineer":
    case "monitor_engineer":
    case "boom_operator":
    case "sound_recordist":
    case "av_integrator":
      return <ConsoleFaderIcon size={size} color={color} />;

    case "rigging":
    case "rigging_trussing":
    case "rigging_staging":
    case "rigging and staging":
    case "rigger":
    case "truss_technician":
    case "stage_technician":
    case "stagehand":
      return <RiggingTrussIcon size={size} color={color} />;

    case "sfx":
    case "sfx_technician":
    case "pyro_operator":
      return <FlameIcon size={size} color={color} />;

    case "camera":
    case "dop":
    case "cinematographer":
    case "camera_operator":
    case "focus_puller":
    case "drone_operator":
    case "dit":
      return <CameraIcon size={size} color={color} />;

    case "direction":
    case "direction_production":
    case "direction and production":
    case "first_ad":
    case "assistant_director":
    case "production_manager":
    case "stage_manager":
    case "production_assistant":
      return <ProductionClapperIcon size={size} color={color} />;

    case "art_set":
    case "art_and_set":
    case "art and set":
    case "art_assistant":
    case "set_builder":
    case "background_crew":
    case "props":
      return <PaletteIcon size={size} color={color} />;

    case "photo_video":
    case "photo_and_video":
    case "photo and video":
    case "event_photographer":
    case "videographer":
    case "livestream_operator":
    case "video_switcher":
      return <PhotoVideoIcon size={size} color={color} />;

    case "post":
    case "post_production":
    case "editor":
    case "colourist":
    case "sound_designer":
      return <SlidersIcon size={size} color={color} />;

    case "led_video":
    case "led_and_video":
    case "led and video walls":
    case "led_wall_technician":
    case "media_server_operator":
    case "video_led_tech":
      return <LedScreenIcon size={size} color={color} />;

    default:
      return <ProductionClapperIcon size={size} color={color} />;
  }
}

export default {
  ConsoleFaderIcon,
  ProductionClapperIcon,
  StageLightIcon,
  RiggingTrussIcon,
  FlameIcon,
  CameraIcon,
  PaletteIcon,
  PhotoVideoIcon,
  SlidersIcon,
  LedScreenIcon,
  WhatsAppIcon,
  SearchIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  BriefcaseIcon,
  SettingsIcon,
  BellIcon,
  ShieldCheckIcon,
  LockIcon,
  AlertTriangleIcon,
  ZapIcon,
  CheckIcon,
  XIcon,
  LogOutIcon,
  getCraftIcon,
};
