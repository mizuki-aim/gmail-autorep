import { z } from "zod";

/**
 * Google Pub/Sub push message schema.
 *
 * When Gmail sends a notification, the Pub/Sub push endpoint receives:
 * - message.data: Base64-encoded JSON with historyId and emailAddress
 * - message.messageId: Pub/Sub message ID (not Gmail messageId)
 * - subscription: The subscription name
 */
export const pubsubPushPayloadSchema = z.object({
  message: z.object({
    // Base64-encoded data containing historyId and emailAddress
    data: z.string(),
    // Pub/Sub message ID (unique identifier for this notification)
    messageId: z.string(),
    // Optional publish time
    publishTime: z.string().optional(),
    // Optional attributes
    attributes: z.record(z.string(), z.string()).optional(),
  }),
  // Subscription name (e.g., "projects/my-project/subscriptions/gmail-push")
  subscription: z.string(),
});

export type PubSubPushPayload = z.infer<typeof pubsubPushPayloadSchema>;

/**
 * Decoded Gmail notification data (from message.data).
 * This is what Gmail actually sends about the email event.
 */
export const gmailNotificationDataSchema = z.object({
  // Email address of the mailbox
  emailAddress: z.string(),
  // History ID to fetch changes since
  historyId: z.string(),
});

export type GmailNotificationData = z.infer<typeof gmailNotificationDataSchema>;

/**
 * Result of processing a Pub/Sub push notification.
 */
export interface PubSubProcessResult {
  /** Pub/Sub message ID (for logging/deduplication) */
  pubsubMessageId: string;
  /** Gmail history ID to fetch changes */
  historyId: string;
  /** Email address of the mailbox */
  emailAddress: string;
}
