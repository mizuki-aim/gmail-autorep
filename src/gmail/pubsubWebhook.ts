import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger/index.js";
import { PubSubError, ValidationError } from "../errors/index.js";
import {
  pubsubPushPayloadSchema,
  gmailNotificationDataSchema,
  type PubSubProcessResult,
} from "./types.js";

/**
 * Middleware to validate Pub/Sub auth token.
 *
 * Google Pub/Sub can be configured to send an auth token in the query string
 * or Authorization header. This middleware validates the token against the
 * configured PUBSUB_AUTH_TOKEN.
 *
 * Security note: This is a simple shared secret validation.
 * For production, consider using Google's push authentication with
 * service account verification.
 */
export function createAuthMiddleware(expectedToken: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check query parameter first (common for Pub/Sub)
    const queryToken = req.query["token"];

    // Also check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

    const providedToken = queryToken ?? bearerToken;

    if (!providedToken) {
      logger.warn("Pub/Sub request missing auth token", {
        path: req.path,
        method: req.method,
      });
      res.status(401).json({ error: "Missing authentication token" });
      return;
    }

    if (providedToken !== expectedToken) {
      logger.warn("Pub/Sub request with invalid auth token", {
        path: req.path,
        method: req.method,
      });
      res.status(403).json({ error: "Invalid authentication token" });
      return;
    }

    next();
  };
}

/**
 * Decode base64 data from Pub/Sub message.
 */
function decodeBase64(data: string): string {
  return Buffer.from(data, "base64").toString("utf-8");
}

/**
 * Parse and validate Pub/Sub push payload.
 *
 * @param body - Raw request body
 * @returns Parsed and validated push payload
 * @throws ValidationError if payload is invalid
 */
export function parsePubSubPayload(body: unknown): PubSubProcessResult {
  // Validate outer Pub/Sub envelope
  const parseResult = pubsubPushPayloadSchema.safeParse(body);
  if (!parseResult.success) {
    throw new ValidationError("Invalid Pub/Sub payload structure", {
      issues: parseResult.error.issues,
    });
  }

  const payload = parseResult.data;

  // Decode and validate inner Gmail notification data
  let decodedData: unknown;
  try {
    const jsonString = decodeBase64(payload.message.data);
    decodedData = JSON.parse(jsonString) as unknown;
  } catch {
    throw new ValidationError("Failed to decode Pub/Sub message data", {
      pubsubMessageId: payload.message.messageId,
    });
  }

  const dataParseResult = gmailNotificationDataSchema.safeParse(decodedData);
  if (!dataParseResult.success) {
    throw new ValidationError("Invalid Gmail notification data", {
      pubsubMessageId: payload.message.messageId,
      issues: dataParseResult.error.issues,
    });
  }

  const gmailData = dataParseResult.data;

  // Log success without sensitive information
  logger.info("Pub/Sub notification received", {
    pubsubMessageId: payload.message.messageId,
    historyId: gmailData.historyId,
    // Only log domain part of email for privacy
    emailDomain: gmailData.emailAddress.split("@")[1],
  });

  return {
    pubsubMessageId: payload.message.messageId,
    historyId: gmailData.historyId,
    emailAddress: gmailData.emailAddress,
  };
}

/**
 * Express request handler for Pub/Sub push endpoint.
 *
 * This handler:
 * 1. Parses the Pub/Sub push payload
 * 2. Extracts Gmail notification data (historyId, emailAddress)
 * 3. Returns 200 to acknowledge receipt (prevents redelivery)
 *
 * Note: Actual email processing should be done asynchronously
 * to avoid Pub/Sub timeout issues.
 */
export function createPubSubHandler(
  onNotification: (result: PubSubProcessResult) => Promise<void>
) {
  return (req: Request, res: Response): void => {
    try {
      const result = parsePubSubPayload(req.body);

      // Acknowledge receipt immediately to prevent Pub/Sub retries
      // Process notification asynchronously
      res.status(200).json({
        status: "received",
        pubsubMessageId: result.pubsubMessageId,
      });

      // Process in background (don't await in response path)
      onNotification(result).catch((error: unknown) => {
        logger.error("Failed to process Pub/Sub notification", {
          pubsubMessageId: result.pubsubMessageId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn("Invalid Pub/Sub payload", {
          error: error.message,
          context: error.context,
        });
        res.status(400).json({
          error: "Invalid payload",
          message: error.message,
        });
        return;
      }

      if (error instanceof PubSubError) {
        logger.error("Pub/Sub processing error", {
          error: error.message,
          context: error.context,
        });
        res.status(500).json({
          error: "Processing error",
          message: error.message,
        });
        return;
      }

      // Unexpected error
      logger.error("Unexpected error in Pub/Sub handler", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
