/** Profile completeness % + next suggested step (sheet §7). Server-side so web and mobile show the same number. */
const STEPS = [
  ["name", "Add your name", (c) => !!c.name, 15],
  ["role", "Choose your role", (c) => !!c.role, 15],
  ["city", "Choose your city", (c) => !!c.city, 15],
  ["profileImage", "Add a profile photo", (c) => !!c.profileImage, 10],
  ["experience", "Add your years of experience", (c) => !!c.experience, 10],
  ["languages", "Add the languages you speak", (c) => (c.languages || []).length > 0, 10],
  ["ratePerDay", "Set your day rate (you choose if it is visible)", (c) => c.ratePerDay != null && c.ratePerDay !== "", 5],
  ["portfolioLinks", "Add an Instagram, YouTube or Drive link", (c) => Object.keys(c.portfolioLinks || {}).length > 0, 5],
  ["pastCredits", "Add a past credit", (c) => (c.pastCredits || []).length > 0, 5],
  ["equipmentOwned", "List equipment you own", (c) => (c.equipmentOwned || []).length > 0, 5],
  ["travelWillingness", "Say how far you will travel", (c) => !!c.travelWillingness, 5],
];
export function completeness(c) {
  const pct = STEPS.reduce((n, s) => n + (s[2](c) ? s[3] : 0), 0);
  const next = STEPS.find((s) => !s[2](c));
  return { profileCompleteness: Math.min(100, pct), nextStep: next ? { key: next[0], label: next[1] } : null };
}
