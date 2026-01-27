import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadConfig, resetConfig } from "../src/config/index.js";

describe("Config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    resetConfig();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should load valid configuration from environment", () => {
    process.env["PUBSUB_AUTH_TOKEN"] = "test-token";
    process.env["GMAIL_CLIENT_ID"] = "client-id";
    process.env["GMAIL_CLIENT_SECRET"] = "client-secret";
    process.env["GMAIL_REFRESH_TOKEN"] = "refresh-token";
    process.env["GMAIL_USER_EMAIL"] = "test@example.com";
    process.env["LLM_API_KEY"] = "llm-key";
    process.env["DISCORD_WEBHOOK_URL"] = "https://discord.com/api/webhooks/123/abc";

    const config = loadConfig();

    expect(config.pubsub.authToken).toBe("test-token");
    expect(config.gmail.clientId).toBe("client-id");
    expect(config.gmail.userEmail).toBe("test@example.com");
    expect(config.discord.webhookUrl).toBe("https://discord.com/api/webhooks/123/abc");
  });

  it("should use default values for optional fields", () => {
    process.env["PUBSUB_AUTH_TOKEN"] = "test-token";
    process.env["GMAIL_CLIENT_ID"] = "client-id";
    process.env["GMAIL_CLIENT_SECRET"] = "client-secret";
    process.env["GMAIL_REFRESH_TOKEN"] = "refresh-token";
    process.env["GMAIL_USER_EMAIL"] = "test@example.com";
    process.env["LLM_API_KEY"] = "llm-key";
    process.env["DISCORD_WEBHOOK_URL"] = "https://discord.com/api/webhooks/123/abc";
    // Remove NODE_ENV to test default value (vitest sets it to "test")
    delete process.env["NODE_ENV"];

    const config = loadConfig();

    expect(config.port).toBe(3000);
    expect(config.nodeEnv).toBe("development");
    expect(config.llm.model).toBe("claude-sonnet-4-20250514");
    expect(config.storage.type).toBe("file");
  });

  it("should parse CLIENT_ALLOWLIST as comma-separated values", () => {
    process.env["PUBSUB_AUTH_TOKEN"] = "test-token";
    process.env["GMAIL_CLIENT_ID"] = "client-id";
    process.env["GMAIL_CLIENT_SECRET"] = "client-secret";
    process.env["GMAIL_REFRESH_TOKEN"] = "refresh-token";
    process.env["GMAIL_USER_EMAIL"] = "test@example.com";
    process.env["LLM_API_KEY"] = "llm-key";
    process.env["DISCORD_WEBHOOK_URL"] = "https://discord.com/api/webhooks/123/abc";
    process.env["CLIENT_ALLOWLIST"] = "client1.com, client2.co.jp, client3.io";

    const config = loadConfig();

    expect(config.clientAllowlist).toEqual([
      "client1.com",
      "client2.co.jp",
      "client3.io",
    ]);
  });

  it("should throw on missing required fields", () => {
    // Missing all required fields
    expect(() => loadConfig()).toThrow();
  });

  it("should throw on invalid email format", () => {
    process.env["PUBSUB_AUTH_TOKEN"] = "test-token";
    process.env["GMAIL_CLIENT_ID"] = "client-id";
    process.env["GMAIL_CLIENT_SECRET"] = "client-secret";
    process.env["GMAIL_REFRESH_TOKEN"] = "refresh-token";
    process.env["GMAIL_USER_EMAIL"] = "not-an-email";
    process.env["LLM_API_KEY"] = "llm-key";
    process.env["DISCORD_WEBHOOK_URL"] = "https://discord.com/api/webhooks/123/abc";

    expect(() => loadConfig()).toThrow();
  });
});
