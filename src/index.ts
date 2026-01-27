/**
 * Gmail Auto-Responder Entry Point
 *
 * This is the main entry point for the application.
 * It starts the HTTP server to receive Pub/Sub push notifications.
 */

import { getConfig } from "./config/index.js";
import { logger } from "./logger/index.js";
import {
  createApp,
  startServer,
  defaultNotificationHandler,
} from "./server.js";

export async function main(): Promise<void> {
  logger.info("Gmail Auto-Responder starting...");

  try {
    const config = getConfig();
    const app = createApp(defaultNotificationHandler);
    await startServer(app, config.port);

    logger.info("Application initialized successfully", {
      port: config.port,
      endpoints: ["/health", "/webhook/pubsub"],
    });
  } catch (error) {
    logger.error("Failed to start application", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Run if executed directly
const scriptPath = process.argv[1];
if (scriptPath && import.meta.url === `file://${scriptPath}`) {
  void main();
}
