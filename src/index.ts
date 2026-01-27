/**
 * Gmail Auto-Responder Entry Point
 *
 * This is the main entry point for the application.
 * Currently serves as a placeholder for the orchestrator.
 */

import { logger } from "./logger/index.js";

export function main(): void {
  logger.info("Gmail Auto-Responder starting...");
  logger.info("Application initialized successfully");
}

// Run if executed directly
const scriptPath = process.argv[1];
if (scriptPath && import.meta.url === `file://${scriptPath}`) {
  main();
}
