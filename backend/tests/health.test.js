import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer, APP_VERSION } from "../app.js";

describe("Shared Express API Service Tests", () => {
  it("creates server instance and returns health response", async () => {
    const server = await createServer();
    assert.ok(server);

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    const res = await fetch(`http://localhost:${port}/health`, {
      headers: { connection: "close" },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.status, "ok");
    assert.equal(body.version, APP_VERSION);
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));

    if (server.closeAllConnections) {
      server.closeAllConnections();
    }
    await new Promise((resolve) => server.close(resolve));
  });
});

