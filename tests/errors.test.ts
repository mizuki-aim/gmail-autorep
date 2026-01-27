import { describe, it, expect } from "vitest";
import {
  AppError,
  ConfigError,
  GmailError,
  LLMError,
  isAppError,
  isOperationalError,
  getErrorMessage,
  ok,
  err,
} from "../src/errors/index.js";

describe("AppError", () => {
  it("should create error with correct properties", () => {
    const error = new AppError("Test error", "TEST_ERROR", 400, true, {
      foo: "bar",
    });

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_ERROR");
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
    expect(error.context).toEqual({ foo: "bar" });
    expect(error.name).toBe("AppError");
  });

  it("should serialize to JSON correctly", () => {
    const error = new AppError("Test error", "TEST_ERROR", 400, true, {
      foo: "bar",
    });
    const json = error.toJSON();

    expect(json.name).toBe("AppError");
    expect(json.message).toBe("Test error");
    expect(json.code).toBe("TEST_ERROR");
    expect(json.statusCode).toBe(400);
    expect(json.context).toEqual({ foo: "bar" });
  });
});

describe("Specialized Errors", () => {
  it("should create ConfigError correctly", () => {
    const error = new ConfigError("Config missing");
    expect(error.code).toBe("CONFIG_ERROR");
    expect(error.statusCode).toBe(500);
  });

  it("should create GmailError correctly", () => {
    const error = new GmailError("Gmail API failed", 403);
    expect(error.code).toBe("GMAIL_ERROR");
    expect(error.statusCode).toBe(403);
  });

  it("should create LLMError correctly", () => {
    const error = new LLMError("LLM timeout");
    expect(error.code).toBe("LLM_ERROR");
    expect(error.statusCode).toBe(500);
  });
});

describe("Error Type Guards", () => {
  it("isAppError should return true for AppError", () => {
    const error = new AppError("Test", "TEST");
    expect(isAppError(error)).toBe(true);
  });

  it("isAppError should return false for regular Error", () => {
    const error = new Error("Test");
    expect(isAppError(error)).toBe(false);
  });

  it("isAppError should return false for non-Error", () => {
    expect(isAppError("error string")).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
  });

  it("isOperationalError should return true for operational AppError", () => {
    const error = new AppError("Test", "TEST", 500, true);
    expect(isOperationalError(error)).toBe(true);
  });

  it("isOperationalError should return false for non-operational AppError", () => {
    const error = new AppError("Test", "TEST", 500, false);
    expect(isOperationalError(error)).toBe(false);
  });

  it("isOperationalError should return false for regular Error", () => {
    const error = new Error("Test");
    expect(isOperationalError(error)).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("should extract message from Error", () => {
    const error = new Error("Test message");
    expect(getErrorMessage(error)).toBe("Test message");
  });

  it("should return string directly", () => {
    expect(getErrorMessage("Test string")).toBe("Test string");
  });

  it("should return default message for unknown types", () => {
    expect(getErrorMessage(123)).toBe("Unknown error occurred");
    expect(getErrorMessage(null)).toBe("Unknown error occurred");
    expect(getErrorMessage(undefined)).toBe("Unknown error occurred");
  });
});

describe("Result type helpers", () => {
  it("ok should create successful result", () => {
    const result = ok("success data");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("success data");
    }
  });

  it("err should create failed result", () => {
    const error = new AppError("Test", "TEST");
    const result = err(error);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(error);
    }
  });
});
