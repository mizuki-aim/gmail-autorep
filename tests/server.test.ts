import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp, type NotificationHandler } from "../src/server.js";
import type { PubSubProcessResult } from "../src/gmail/types.js";

// Mock the config module
vi.mock("../src/config/index.js", () => ({
  getConfig: () => ({
    port: 3000,
    pubsub: {
      authToken: "test-auth-token",
    },
  }),
}));

// Mock logger
vi.mock("../src/logger/index.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Server", () => {
  let notificationHandler: NotificationHandler;
  let notificationHandlerMock: ReturnType<typeof vi.fn<NotificationHandler>>;

  beforeEach(() => {
    notificationHandlerMock = vi.fn<NotificationHandler>().mockResolvedValue(undefined);
    notificationHandler = notificationHandlerMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Health endpoint", () => {
    it("should return healthy status", async () => {
      const app = createApp(notificationHandler);

      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "healthy" });
    });
  });

  describe("Pub/Sub webhook endpoint", () => {
    function createValidPayload(): object {
      const data = Buffer.from(
        JSON.stringify({
          historyId: "12345",
          emailAddress: "test@example.com",
        })
      ).toString("base64");

      return {
        message: {
          data,
          messageId: "pubsub-123",
        },
        subscription: "projects/test/subscriptions/gmail",
      };
    }

    it("should accept valid request with correct auth token", async () => {
      const app = createApp(notificationHandler);
      const payload = createValidPayload();

      const response = await request(app)
        .post("/webhook/pubsub?token=test-auth-token")
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("received");
    });

    it("should reject request without auth token", async () => {
      const app = createApp(notificationHandler);
      const payload = createValidPayload();

      const response = await request(app).post("/webhook/pubsub").send(payload);

      expect(response.status).toBe(401);
    });

    it("should reject request with wrong auth token", async () => {
      const app = createApp(notificationHandler);
      const payload = createValidPayload();

      const response = await request(app)
        .post("/webhook/pubsub?token=wrong-token")
        .send(payload);

      expect(response.status).toBe(403);
    });

    it("should call notification handler with parsed data", async () => {
      const app = createApp(notificationHandler);
      const payload = createValidPayload();

      await request(app)
        .post("/webhook/pubsub?token=test-auth-token")
        .send(payload);

      // Wait for async handler
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(notificationHandlerMock).toHaveBeenCalledWith({
        pubsubMessageId: "pubsub-123",
        historyId: "12345",
        emailAddress: "test@example.com",
      } satisfies PubSubProcessResult);
    });
  });

  describe("404 handler", () => {
    it("should return 404 for unknown routes", async () => {
      const app = createApp(notificationHandler);

      const response = await request(app).get("/unknown");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Not found" });
    });
  });
});
