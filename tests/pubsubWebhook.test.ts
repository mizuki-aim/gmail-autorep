import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import {
  createAuthMiddleware,
  createPubSubHandler,
  parsePubSubPayload,
} from "../src/gmail/pubsubWebhook.js";
import type { PubSubProcessResult } from "../src/gmail/types.js";

// Mock logger to prevent console output during tests
vi.mock("../src/logger/index.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

/**
 * Helper to create a valid Pub/Sub push payload.
 */
function createValidPayload(
  historyId = "12345",
  emailAddress = "test@example.com"
): object {
  const data = Buffer.from(
    JSON.stringify({ historyId, emailAddress })
  ).toString("base64");

  return {
    message: {
      data,
      messageId: "pub-sub-msg-123",
      publishTime: "2024-01-01T00:00:00Z",
    },
    subscription: "projects/test-project/subscriptions/gmail-push",
  };
}

describe("createAuthMiddleware", () => {
  const AUTH_TOKEN = "test-secret-token";

  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.post(
      "/test",
      createAuthMiddleware(AUTH_TOKEN),
      (_req, res) => {
        res.status(200).json({ success: true });
      }
    );
    return app;
  }

  it("should allow request with valid token in query", async () => {
    const app = createTestApp();

    const response = await request(app)
      .post("/test?token=test-secret-token")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  it("should allow request with valid Bearer token in header", async () => {
    const app = createTestApp();

    const response = await request(app)
      .post("/test")
      .set("Authorization", "Bearer test-secret-token")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  it("should reject request with missing token", async () => {
    const app = createTestApp();

    const response = await request(app).post("/test").send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Missing authentication token" });
  });

  it("should reject request with invalid token in query", async () => {
    const app = createTestApp();

    const response = await request(app)
      .post("/test?token=wrong-token")
      .send({});

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Invalid authentication token" });
  });

  it("should reject request with invalid Bearer token", async () => {
    const app = createTestApp();

    const response = await request(app)
      .post("/test")
      .set("Authorization", "Bearer wrong-token")
      .send({});

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Invalid authentication token" });
  });

  it("should prefer query token over header token", async () => {
    const app = createTestApp();

    // Query has correct token, header has wrong token
    const response = await request(app)
      .post("/test?token=test-secret-token")
      .set("Authorization", "Bearer wrong-token")
      .send({});

    expect(response.status).toBe(200);
  });
});

describe("parsePubSubPayload", () => {
  it("should parse valid Pub/Sub payload", () => {
    const payload = createValidPayload("67890", "user@gmail.com");

    const result = parsePubSubPayload(payload);

    expect(result).toEqual({
      pubsubMessageId: "pub-sub-msg-123",
      historyId: "67890",
      emailAddress: "user@gmail.com",
    });
  });

  it("should throw ValidationError for invalid outer structure", () => {
    const invalidPayload = {
      // Missing required fields
      data: "some-data",
    };

    expect(() => parsePubSubPayload(invalidPayload)).toThrow(
      "Invalid Pub/Sub payload structure"
    );
  });

  it("should throw ValidationError for invalid base64 data", () => {
    const payload = {
      message: {
        data: "not-valid-base64!!!",
        messageId: "msg-123",
      },
      subscription: "projects/test/subscriptions/test",
    };

    expect(() => parsePubSubPayload(payload)).toThrow(
      "Failed to decode Pub/Sub message data"
    );
  });

  it("should throw ValidationError for invalid Gmail notification data", () => {
    // Valid base64 but invalid JSON structure
    const data = Buffer.from(JSON.stringify({ invalid: "data" })).toString(
      "base64"
    );

    const payload = {
      message: {
        data,
        messageId: "msg-123",
      },
      subscription: "projects/test/subscriptions/test",
    };

    expect(() => parsePubSubPayload(payload)).toThrow(
      "Invalid Gmail notification data"
    );
  });
});

describe("createPubSubHandler", () => {
  type NotificationHandler = (result: PubSubProcessResult) => Promise<void>;
  let notificationHandler: NotificationHandler;
  let notificationHandlerMock: ReturnType<typeof vi.fn<NotificationHandler>>;

  beforeEach(() => {
    notificationHandlerMock = vi.fn<NotificationHandler>().mockResolvedValue(undefined);
    notificationHandler = notificationHandlerMock;
  });

  function createTestApp() {
    const app = express();
    app.use(express.json());
    app.post("/webhook", createPubSubHandler(notificationHandler));
    return app;
  }

  it("should return 200 and call handler for valid payload", async () => {
    const app = createTestApp();
    const payload = createValidPayload();

    const response = await request(app).post("/webhook").send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "received",
      pubsubMessageId: "pub-sub-msg-123",
    });

    // Wait a tick for async handler to be called
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(notificationHandlerMock).toHaveBeenCalledWith({
      pubsubMessageId: "pub-sub-msg-123",
      historyId: "12345",
      emailAddress: "test@example.com",
    });
  });

  it("should return 400 for invalid payload", async () => {
    const app = createTestApp();
    const invalidPayload = { invalid: "data" };

    const response = await request(app).post("/webhook").send(invalidPayload);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid payload");
    expect(notificationHandlerMock).not.toHaveBeenCalled();
  });

  it("should still return 200 even if handler fails", async () => {
    // Handler failure shouldn't affect the HTTP response
    notificationHandlerMock.mockRejectedValue(new Error("Handler failed"));

    const app = createTestApp();
    const payload = createValidPayload();

    const response = await request(app).post("/webhook").send(payload);

    // Should still return 200 (ack immediately)
    expect(response.status).toBe(200);
  });
});

describe("E2E: Full webhook flow", () => {
  it("should process valid request with auth", async () => {
    const AUTH_TOKEN = "e2e-test-token";
    type NotificationHandler = (result: PubSubProcessResult) => Promise<void>;
    const handlerMock = vi.fn<NotificationHandler>().mockResolvedValue(undefined);
    const handler: NotificationHandler = handlerMock;

    const app = express();
    app.use(express.json());
    app.post(
      "/webhook/pubsub",
      createAuthMiddleware(AUTH_TOKEN),
      createPubSubHandler(handler)
    );

    const payload = createValidPayload("99999", "e2e@test.com");

    const response = await request(app)
      .post("/webhook/pubsub?token=e2e-test-token")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("received");

    // Wait for async handler
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handlerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        historyId: "99999",
        emailAddress: "e2e@test.com",
      })
    );
  });
});
