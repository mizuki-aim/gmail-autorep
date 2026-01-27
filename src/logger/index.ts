export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Patterns for sensitive data that should be redacted in logs.
 * These patterns match common sensitive fields in objects.
 */
const SENSITIVE_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /key/i,
  /auth/i,
  /credential/i,
  /bearer/i,
];

/**
 * Redact sensitive values from an object for safe logging.
 */
function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_PATTERNS.some((pattern) =>
      pattern.test(key)
    );

    if (isSensitive) {
      result[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = redactSensitive(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

class Logger {
  private minLevel: LogLevel;
  private isProduction: boolean;

  constructor(minLevel: LogLevel = "info", isProduction = false) {
    this.minLevel = minLevel;
    this.isProduction = isProduction;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatEntry(entry: LogEntry): string {
    if (this.isProduction) {
      // JSON format for production (structured logging)
      return JSON.stringify(entry);
    }

    // Human-readable format for development
    const { level, message, timestamp, context } = entry;
    const levelUpper = level.toUpperCase().padEnd(5);
    const contextStr = context
      ? ` ${JSON.stringify(context)}`
      : "";
    return `[${timestamp}] ${levelUpper} ${message}${contextStr}`;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: context ? redactSensitive(context) : undefined,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      default:
        console.log(formatted);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context);
  }

  /**
   * Create a child logger with additional default context.
   */
  child(defaultContext: Record<string, unknown>): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

class ChildLogger {
  constructor(
    private parent: Logger,
    private defaultContext: Record<string, unknown>
  ) {}

  private mergeContext(
    context?: Record<string, unknown>
  ): Record<string, unknown> {
    return { ...this.defaultContext, ...context };
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.parent.info(message, this.mergeContext(context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.parent.warn(message, this.mergeContext(context));
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.parent.error(message, this.mergeContext(context));
  }
}

/**
 * Create and configure the default logger based on environment.
 */
function createLogger(): Logger {
  const isProduction = process.env["NODE_ENV"] === "production";
  const envLogLevel = process.env["LOG_LEVEL"] as LogLevel | undefined;
  const logLevel = envLogLevel ?? (isProduction ? "info" : "debug");

  return new Logger(logLevel, isProduction);
}

// Export singleton logger instance
export const logger = createLogger();

export { Logger, ChildLogger, redactSensitive };
