# Changelog

All notable changes to `blueticks` (Node/TS SDK) are documented here. Follows
[Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

## [3.2.0] — 2026-04-29

### Added
- `client.chats.listMessages()` now accepts `message_types?: MessageType[]` to
  filter the response to specific message kinds (e.g. `["document"]` for PDFs,
  `["image"]` for photos). Server-side default-excludes system events
  (`gp2`, `revoked`, `newsletter_notification`) when omitted.
- `MessageType` type — string-union of the 13 WhatsApp message kinds.
- `ChatMessage.caption` and `ChatMessage.filename` — surfaced for media
  messages so document listings are self-describing without an extra
  media-fetch round-trip.

### Fixed
- Stale list-test mocks (`audiences`, `campaigns`, `webhooks`) that were
  asserting on bare-array responses now use the cursor-paginated
  `Page<T>` envelope. Behaviour-only test fix; runtime unchanged.

## [1.1.0] — 2026-04-23

### Added
- `client.messages.send()` and `.get()` for `/v1/messages`.
- `client.webhooks.*` — CRUD + `rotateSecret()`.
- `client.audiences.*` — CRUD + `appendContacts()`, `updateContact()`, `deleteContact()`.
- `client.campaigns.*` — CRUD + `pause()`, `resume()`, `cancel()`.
- `verifyWebhook()` helper + `WebhookVerificationError` — exported from the
  `blueticks/webhooks` subpath and re-exported from the root for convenience.

## [1.0.0] — unreleased

### Added
- Initial release.
- `Blueticks.ping()` — health check.
- `Blueticks.account.retrieve()` — fetch the authenticated account.
- Typed exception hierarchy: `AuthenticationError`, `PermissionDeniedError`,
  `NotFoundError`, `BadRequestError`, `RateLimitError`, `APIError`, `APIConnectionError`.
- `ValidationError` (re-exported Zod `ZodError`) for schema mismatches.
- Retry logic with exponential backoff + jitter on 429/502/503/504/network errors.
- Dual ESM + CommonJS build via tsup.
- Node 18, 20, 22 support.
