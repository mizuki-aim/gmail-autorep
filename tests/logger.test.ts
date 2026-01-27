import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger, redactSensitive } from "../src/logger/index.js";

describe("Logger", () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should log messages at info level", () => {
    const logger = new Logger("info", false);
    logger.info("Test message");

    expect(consoleSpy.log).toHaveBeenCalled();
    const logOutput = consoleSpy.log.mock.calls[0]?.[0] as string;
    expect(logOutput).toContain("INFO");
    expect(logOutput).toContain("Test message");
  });

  it("should not log debug when level is info", () => {
    const logger = new Logger("info", false);
    logger.debug("Debug message");

    expect(consoleSpy.log).not.toHaveBeenCalled();
  });

  it("should log debug when level is debug", () => {
    const logger = new Logger("debug", false);
    logger.debug("Debug message");

    expect(consoleSpy.log).toHaveBeenCalled();
  });

  it("should use console.error for error level", () => {
    const logger = new Logger("info", false);
    logger.error("Error message");

    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it("should use console.warn for warn level", () => {
    const logger = new Logger("info", false);
    logger.warn("Warning message");

    expect(consoleSpy.warn).toHaveBeenCalled();
  });

  it("should output JSON in production mode", () => {
    const logger = new Logger("info", true);
    logger.info("Test message", { name: "value" });

    expect(consoleSpy.log).toHaveBeenCalled();
    const logOutput = consoleSpy.log.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(logOutput) as Record<string, unknown>;
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("Test message");
    expect(parsed.context).toEqual({ name: "value" });
  });

  it("should create child logger with default context", () => {
    const logger = new Logger("info", true);
    const childLogger = logger.child({ module: "test" });
    childLogger.info("Child message", { extra: "data" });

    expect(consoleSpy.log).toHaveBeenCalled();
    const logOutput = consoleSpy.log.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(logOutput) as { context: Record<string, unknown> };
    expect(parsed.context.module).toBe("test");
    expect(parsed.context.extra).toBe("data");
  });
});

describe("redactSensitive", () => {
  it("should redact token fields", () => {
    const result = redactSensitive({ authToken: "secret123" });
    expect(result.authToken).toBe("[REDACTED]");
  });

  it("should redact password fields", () => {
    const result = redactSensitive({ password: "secret123" });
    expect(result.password).toBe("[REDACTED]");
  });

  it("should redact secret fields", () => {
    const result = redactSensitive({ clientSecret: "secret123" });
    expect(result.clientSecret).toBe("[REDACTED]");
  });

  it("should redact key fields", () => {
    const result = redactSensitive({ apiKey: "secret123" });
    expect(result.apiKey).toBe("[REDACTED]");
  });

  it("should not redact non-sensitive fields", () => {
    const result = redactSensitive({ username: "john", email: "john@example.com" });
    expect(result.username).toBe("john");
    expect(result.email).toBe("john@example.com");
  });

  it("should handle nested objects", () => {
    const result = redactSensitive({
      config: {
        apiKey: "secret123",
        endpoint: "https://api.example.com",
      },
    });
    expect((result.config as Record<string, unknown>).apiKey).toBe("[REDACTED]");
    expect((result.config as Record<string, unknown>).endpoint).toBe(
      "https://api.example.com"
    );
  });
});
