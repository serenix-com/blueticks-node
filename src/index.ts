// src/index.ts
export { Blueticks } from "./client";
export type { BluetickOptions } from "./client";
export {
  BluetickError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  BadRequestError,
  RateLimitError,
  APIError,
  APIConnectionError,
  ValidationError,
} from "./errors";
export type { ErrorDetail } from "./errors";
export { VERSION } from "./version";
export { verifyWebhook, WebhookVerificationError, type VerifyWebhookParams } from "./webhooks";
