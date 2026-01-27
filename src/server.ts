import express, { type Express, type Request, type Response } from "express";
import { getConfig } from "./config/index.js";
import { logger } from "./logger/index.js";
import {
  createAuthMiddleware,
  createPubSubHandler,
} from "./gmail/pubsubWebhook.js";
import type { PubSubProcessResult } from "./gmail/types.js";

/**
 * Notification handler type.
 * This will be replaced with the actual orchestrator in P1-7.
 */
export type NotificationHandler = (result: PubSubProcessResult) => Promise<void>;

/**
 * Create and configure the Express application.
 */
export function createApp(onNotification: NotificationHandler): Express {
  const app = express();
  const config = getConfig();

  // Parse JSON bodies
  app.use(express.json());

  // Health check endpoint (no auth required)
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "healthy" });
  });

  // Pub/Sub webhook endpoint with auth middleware
  app.post(
    "/webhook/pubsub",
    createAuthMiddleware(config.pubsub.authToken),
    createPubSubHandler(onNotification)
  );

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}

/**
 * Start the HTTP server.
 */
export function startServer(
  app: Express,
  port: number
): Promise<ReturnType<Express["listen"]>> {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info("Server started", { port });
      resolve(server);
    });
  });
}

/**
 * Default notification handler (placeholder).
 * Will be replaced by the orchestrator in P1-7.
 */
export const defaultNotificationHandler: NotificationHandler = (
  result
): Promise<void> => {
  logger.info("Processing notification (placeholder)", {
    pubsubMessageId: result.pubsubMessageId,
    historyId: result.historyId,
  });
  // TODO: Implement actual processing in P1-7
  return Promise.resolve();
};
