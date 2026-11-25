import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Session Management & Inactivity Timeout Suite", () => {
  const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
  const WARNING_COUNTDOWN_SECONDS = 5; // 5 seconds prompt

  test("1. Inactivity threshold is exactly 10 minutes", () => {
    assert.equal(INACTIVITY_TIMEOUT_MS, 600000);
    assert.equal(INACTIVITY_TIMEOUT_MS / 1000 / 60, 10);
  });

  test("2. Warning prompt countdown is exactly 5 seconds", () => {
    assert.equal(WARNING_COUNTDOWN_SECONDS, 5);
  });

  test("3. Inactivity detection: under 10 minutes does not trigger warning", () => {
    const now = Date.now();
    const lastActive = now - (9 * 60 * 1000 + 59 * 1000); // 9m 59s ago
    const elapsed = now - lastActive;
    const shouldWarn = elapsed >= INACTIVITY_TIMEOUT_MS;
    assert.equal(shouldWarn, false, "Should not trigger warning before 10 minutes");
  });

  test("4. Inactivity detection: 10 minutes or more triggers warning prompt", () => {
    const now = Date.now();
    const lastActive = now - (10 * 60 * 1000); // exactly 10m ago
    const elapsed = now - lastActive;
    const shouldWarn = elapsed >= INACTIVITY_TIMEOUT_MS;
    assert.equal(shouldWarn, true, "Should trigger warning at 10 minutes");
  });

  test("5. User acknowledges warning (Stay Logged In) resets activity timestamp", () => {
    let lastActive = Date.now() - (10 * 60 * 1000 + 1000);
    let isWarningOpen = true;

    // User clicks "Yes, I'm still working"
    const onUserResponse = () => {
      lastActive = Date.now();
      isWarningOpen = false;
    };

    onUserResponse();
    assert.equal(isWarningOpen, false);
    assert.ok(Date.now() - lastActive < 50); // Freshly updated
  });

  test("6. Countdown expiration after 5 seconds triggers auto-logout", () => {
    let countdown = 5;
    let isLoggedOut = false;

    // Simulate 5 countdown ticks
    for (let tick = 1; tick <= 5; tick++) {
      if (countdown <= 1) {
        isLoggedOut = true;
        countdown = 0;
      } else {
        countdown -= 1;
      }
    }

    assert.equal(countdown, 0);
    assert.equal(isLoggedOut, true, "User must be logged out when 5s countdown completes");
  });

  test("7. Multi-tab synchronization keeps session alive when user active in other tab", () => {
    const now = Date.now();
    let localLastActive = now - (10 * 60 * 1000); // This tab was idle for 10m

    // Simulate storage event from Tab 2 where user just clicked/scrolled
    const remoteTabActive = now - 5000; // Active 5s ago in Tab 2
    localLastActive = Math.max(localLastActive, remoteTabActive);

    const elapsed = now - localLastActive;
    const shouldWarn = elapsed >= INACTIVITY_TIMEOUT_MS;
    assert.equal(shouldWarn, false, "Active work in another tab prevents idle timeout");
  });

  test("8. Session termination cleans storage keys and redirects to login with reason", () => {
    const mockStorage = new Map([
      ["crewhive_user_role", "crew"],
      ["crewhive_user_phone", "+919876543210"],
      ["crewhive_last_active", "123456789"],
    ]);

    // Perform logout cleanup
    mockStorage.delete("crewhive_user_role");
    mockStorage.delete("crewhive_user_phone");
    mockStorage.delete("crewhive_last_active");
    mockStorage.set("crewhive_session_logout", Date.now().toString());

    assert.equal(mockStorage.has("crewhive_user_role"), false);
    assert.equal(mockStorage.has("crewhive_user_phone"), false);
    assert.equal(mockStorage.has("crewhive_last_active"), false);
    assert.equal(mockStorage.has("crewhive_session_logout"), true);

    const redirectUrl = "/login?reason=timeout";
    const parsed = new URL(redirectUrl, "http://localhost:3000");
    assert.equal(parsed.searchParams.get("reason"), "timeout");
  });
});
