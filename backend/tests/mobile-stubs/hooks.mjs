// Resolve hook: lets the REAL mobile service code (api.js, authService.js, …) run in Node by stubbing only native Expo modules.
const stubs = { "expo-secure-store": "secure-store.mjs", "expo-file-system/legacy": "file-system.mjs", "expo-constants": "constants.mjs" };
export async function resolve(specifier, context, next) {
  if (stubs[specifier]) return { url: new URL(`./${stubs[specifier]}`, import.meta.url).href, shortCircuit: true };
  if (specifier === "next/server") return next("next/server.js", context); // Next resolves this via its bundler; Node needs the extension
  return next(specifier, context);
}
