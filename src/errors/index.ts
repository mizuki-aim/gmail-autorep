/**
 * Base error class for all application-specific errors.
 * Provides a consistent error structure with error codes.
 */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    isOperational = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

/**
 * Error for configuration-related issues.
 */
export class ConfigError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "CONFIG_ERROR", 500, true, context);
  }
}

/**
 * Error for Gmail API-related issues.
 */
export class GmailError extends AppError {
  constructor(
    message: string,
    statusCode = 500,
    context?: Record<string, unknown>
  ) {
    super(message, "GMAIL_ERROR", statusCode, true, context);
  }
}

/**
 * Error for Pub/Sub-related issues.
 */
export class PubSubError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "PUBSUB_ERROR", 400, true, context);
  }
}

/**
 * Error for LLM-related issues (timeout, parse failure, etc.).
 */
export class LLMError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "LLM_ERROR", 500, true, context);
  }
}

/**
 * Error for Discord notification issues.
 */
export class DiscordError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "DISCORD_ERROR", 500, true, context);
  }
}

/**
 * Error for validation failures.
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, true, context);
  }
}

/**
 * Type guard to check if an error is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is an operational error
 * (expected errors that we can handle gracefully).
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Safely extract error message from unknown error type.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error occurred";
}

/**
 * Wrap an async function to handle errors consistently.
 */
export function wrapAsync<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw new AppError(
        getErrorMessage(error),
        "UNEXPECTED_ERROR",
        500,
        false,
        { originalError: String(error) }
      );
    }
  };
}

/**
 * Result type for operations that can fail.
 * Used for explicit error handling without exceptions.
 */
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a successful result.
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failed result.
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}
