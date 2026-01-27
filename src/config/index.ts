import { config as dotenvConfig } from "dotenv";
import { configSchema, type Config } from "./schema.js";

// Load .env file in development
dotenvConfig();

/**
 * Parse comma-separated string into array, filtering empty values
 */
function parseCommaSeparated(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Load and validate configuration from environment variables.
 * Throws ZodError if validation fails.
 */
export function loadConfig(): Config {
  const rawConfig = {
    port: process.env["PORT"],
    nodeEnv: process.env["NODE_ENV"],
    pubsub: {
      authToken: process.env["PUBSUB_AUTH_TOKEN"] ?? "",
    },
    gmail: {
      clientId: process.env["GMAIL_CLIENT_ID"] ?? "",
      clientSecret: process.env["GMAIL_CLIENT_SECRET"] ?? "",
      refreshToken: process.env["GMAIL_REFRESH_TOKEN"] ?? "",
      userEmail: process.env["GMAIL_USER_EMAIL"] ?? "",
    },
    llm: {
      apiKey: process.env["LLM_API_KEY"] ?? "",
      model: process.env["LLM_MODEL"],
      maxTokens: process.env["LLM_MAX_TOKENS"],
      timeoutMs: process.env["LLM_TIMEOUT_MS"],
    },
    discord: {
      webhookUrl: process.env["DISCORD_WEBHOOK_URL"] ?? "",
    },
    clientAllowlist: parseCommaSeparated(process.env["CLIENT_ALLOWLIST"]),
    storage: {
      type: process.env["STORAGE_TYPE"] as "memory" | "file" | undefined,
      filePath: process.env["STORAGE_FILE_PATH"],
    },
  };

  return configSchema.parse(rawConfig);
}

/**
 * Cached configuration instance.
 * Use getConfig() to access the validated configuration.
 */
let cachedConfig: Config | null = null;

/**
 * Get the validated configuration, loading it if not already cached.
 * This is the primary way to access configuration throughout the app.
 */
export function getConfig(): Config {
  cachedConfig ??= loadConfig();
  return cachedConfig;
}

/**
 * Reset the cached configuration (useful for testing).
 */
export function resetConfig(): void {
  cachedConfig = null;
}

export { type Config } from "./schema.js";
