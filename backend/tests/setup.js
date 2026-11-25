// Runs before every test file. Forces an isolated mock environment and removes any chance of reaching real Firebase/providers.
process.env.APP_ENV = "test";
process.env.FIREBASE_MODE = "mock";
for (const k of ["FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_ADMIN_PRIVATE_KEY", "FIREBASE_WEB_API_KEY", "MSG91_AUTH_KEY", "MSG91_WHATSAPP_NUMBER"]) delete process.env[k];
process.env.SUPER_ADMIN_PHONE = "+919000000001";
process.env.WHATSAPP_WEBHOOK_SECRET = "test-secret";
process.env.WHATSAPP_VERIFY_TOKEN = "verify-me";
process.env.RATE_LIMIT_API_MAX = "100000";
process.env.RATE_LIMIT_AUTH_MAX = "100000";
process.env.OTP_MAX_PER_WINDOW = "100000";
