import { z } from "zod";

/**
 * Configuration schema using Zod for runtime validation.
 * All sensitive values are loaded from environment variables.
 */
export const configSchema = z.object({
  // Server configuration
  port: z.coerce.number().int().positive().default(3000),
  nodeEnv: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Google Pub/Sub configuration
  pubsub: z.object({
    authToken: z.string().min(1, "PUBSUB_AUTH_TOKEN is required"),
  }),

  // Gmail API configuration
  gmail: z.object({
    clientId: z.string().min(1, "GMAIL_CLIENT_ID is required"),
    clientSecret: z.string().min(1, "GMAIL_CLIENT_SECRET is required"),
    refreshToken: z.string().min(1, "GMAIL_REFRESH_TOKEN is required"),
    userEmail: z.email("GMAIL_USER_EMAIL must be a valid email"),
  }),

  // LLM configuration
  llm: z.object({
    apiKey: z.string().min(1, "LLM_API_KEY is required"),
    model: z.string().default("claude-sonnet-4-20250514"),
    maxTokens: z.coerce.number().int().positive().default(1024),
    timeoutMs: z.coerce.number().int().positive().default(30000),
  }),

  // Discord configuration
  discord: z.object({
    webhookUrl: z.url("DISCORD_WEBHOOK_URL must be a valid URL"),
  }),

  // Client allowlist for priority override (comma-separated domains)
  clientAllowlist: z.array(z.string()).default([]),

  // Idempotency store configuration
  storage: z.object({
    type: z.enum(["memory", "file"]).default("file"),
    filePath: z.string().default("./data/processed-ids.json"),
  }),
});

export type Config = z.infer<typeof configSchema>;
