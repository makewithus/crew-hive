/**
 * CrewHive Cities & Regional Geographic Taxonomy
 * Centralized launch city configurations and official 14 Kerala revenue districts.
 */

export const LAUNCH_CITIES = [
  { id: "kochi", nameEn: "Kochi", nameMl: "കൊച്ചി", district: "Ernakulam", isLaunchCity: true },
  { id: "thiruvananthapuram", nameEn: "Thiruvananthapuram", nameMl: "തിരുവനന്തപുരം", district: "Thiruvananthapuram", isLaunchCity: true },
  { id: "kozhikode", nameEn: "Kozhikode", nameMl: "കോഴിക്കോട്", district: "Kozhikode", isLaunchCity: true },
];

export const KERALA_DISTRICTS = [
  { id: "alappuzha", nameEn: "Alappuzha", nameMl: "ആലപ്പുഴ", lat: 9.4981, lng: 76.3388 },
  { id: "ernakulam", nameEn: "Ernakulam", nameMl: "എറണാകുളം", lat: 9.9816, lng: 76.2999 },
  { id: "idukki", nameEn: "Idukki", nameMl: "ഇടുക്കി", lat: 9.8494, lng: 76.9806 },
  { id: "kannur", nameEn: "Kannur", nameMl: "കണ്ണൂർ", lat: 11.8745, lng: 75.3704 },
  { id: "kasaragod", nameEn: "Kasaragod", nameMl: "കാസർഗോഡ്", lat: 12.5102, lng: 74.9852 },
  { id: "kollam", nameEn: "Kollam", nameMl: "കൊല്ലം", lat: 8.8932, lng: 76.6141 },
  { id: "kottayam", nameEn: "Kottayam", nameMl: "കോട്ടയം", lat: 9.5916, lng: 76.5222 },
  { id: "kozhikode", nameEn: "Kozhikode", nameMl: "കോഴിക്കോട്", lat: 11.2588, lng: 75.7804 },
  { id: "malappuram", nameEn: "Malappuram", nameMl: "മലപ്പുറം", lat: 11.0510, lng: 76.0711 },
  { id: "palakkad", nameEn: "Palakkad", nameMl: "പാലക്കാട്", lat: 10.7867, lng: 76.6548 },
  { id: "pathanamthitta", nameEn: "Pathanamthitta", nameMl: "പത്തനംതിട്ട", lat: 9.2648, lng: 76.7870 },
  { id: "thiruvananthapuram", nameEn: "Thiruvananthapuram", nameMl: "തിരുവനന്തപുരം", lat: 8.5241, lng: 76.9366 },
  { id: "thrissur", nameEn: "Thrissur", nameMl: "തൃശ്ശൂർ", lat: 10.5276, lng: 76.2144 },
  { id: "wayanad", nameEn: "Wayanad", nameMl: "വയനാട്", lat: 11.6854, lng: 76.1320 },
];

export function normalizeDistrict(input) {
  if (!input) return "";
  const cleaned = String(input).trim().toLowerCase();
  
  if (cleaned.includes("kochi") || cleaned.includes("cochin")) return "Ernakulam";
  if (cleaned.includes("trivandrum")) return "Thiruvananthapuram";
  if (cleaned.includes("calicut")) return "Kozhikode";

  const match = KERALA_DISTRICTS.find(
    (d) => d.id === cleaned || d.nameEn.toLowerCase() === cleaned || d.nameMl === input
  );
  return match ? match.nameEn : input;
}

export function isValidKeralaDistrict(input) {
  if (!input) return false;
  const normalized = normalizeDistrict(input).toLowerCase();
  return KERALA_DISTRICTS.some((d) => d.nameEn.toLowerCase() === normalized);
}

export function getDistrictsList(language = "en") {
  return KERALA_DISTRICTS.map((d) => ({
    id: d.id,
    name: language === "ml" ? d.nameMl : d.nameEn,
    nameEn: d.nameEn,
    nameMl: d.nameMl,
  }));
}

export default {
  LAUNCH_CITIES,
  KERALA_DISTRICTS,
  normalizeDistrict,
  isValidKeralaDistrict,
  getDistrictsList,
};

