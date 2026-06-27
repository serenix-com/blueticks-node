# Changelog

All notable changes to `blueticks` (Node/TS SDK) are documented here. Follows
[Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — 2026-06-25

### Changed

- **Newsletters: identity field renamed and split by surface (breaking).** The
  `/v1/newsletters` resource now keys rows differently depending on the surface,
  matching the rest of the API:
  - `newsletters.list()` rows are now `NewsletterListItem` and use `chatId`
    (was `id`) — consistent with how `chats`/`contacts`/`groups` key list rows.
  - `newsletters.create()` and `newsletters.retrieve()` still return
    `Newsletter`, but its identity field is now `newsletterId` (was `id`).
  - A new `NewsletterListItem` / `NewsletterListItemSchema` type is exported.
    The stale `owner` field (absent from the current spec) was dropped from the
    newsletter shapes.

## [4.2.0] — 2026-06-18

### Removed

- Removed webhook signature verification (`verifyWebhook`/`WebhookVerificationError`),
  the webhook signing `secret`, and `rotateSecret` — webhook deliveries are no longer
  signed. The `blueticks/webhooks` subpath, `WebhookCreateResult`, and `WebhookEvent`
  types are gone; `webhooks.create()` now returns a plain `Webhook`.

## [3.5.0] — 2026-05-22

OpenAPI parity pass. The SDK now matches `backend/openapi.json`
operation-for-operation; an engineless drift check
(`.github/workflows/sdk-spec-drift.yml`) gates future regressions. The
`/v1/*` surface is pre-release — none of these changes affect production
callers yet.

### Changed

- `messages.send()` now takes a discriminated union body matching the
  backend's strict `anyOf` (BE#50). `SendMessageParams` is now
  `SendTextMessageParams | SendMediaMessageParams | SendPollMessageParams`:
  ```ts
  client.messages.send({ to: '+1...', type: 'text', text: 'hi' });
  client.messages.send({ to: '+1...', type: 'media', media: { url: '...', kind: 'image' } });
  client.messages.send({ to: '+1...', type: 'poll',  poll: { question: '...', options: [...] } });
  ```
- Single-item GETs now use `.retrieve(id)` instead of `.get(id)`:
  `audiences`, `campaigns`, `chats`, `groups`, `webhooks`, `messages`,
  `scheduledMessages`. Also `engines.status()` → `engines.retrieve()`.
- `newsletters.create()` returns typed `Newsletter` (8 fields).

### Added

- `newsletters.list({ limit, cursor })` — `GET /v1/newsletters`
- `newsletters.retrieve(id)` — `GET /v1/newsletters/{id}`
- `ping.retrieve()` — typed `Ping` (`account_id`, `key_prefix`, `scopes`).
- `MessageSchema` now exposes `key`, `type`, `media_kind`, `poll_question`, `link_preview`.

### Removed

- `engines.me`, `engines.logout`, `engines.reload`
- `contacts.getProfilePicture`
- `utils.validatePhone`, `utils.linkPreview` (the `utils` resource is now empty)

### Fixed

- `groups.list()` was documented at `dev.blueticks.co` but absent from the SDK for ~9 days — now present.

## [3.3.0] — 2026-04-30

### Added
- `ChatMedia.original_quality: boolean | null` — false when WA returned
  a preview JPEG instead of the original sender uploaded (#113 — only
  affects own-sent newsletter media; received media and 1:1/group media
  always return the genuine original).
- `ChatMedia.media_unavailable: MediaUnavailableReason | null` — reason
  the bytes couldn't be retrieved (`expired`, `fetching`, `error`, or
  `no_media`). null/absent on success.
- `MediaUnavailableReason` type — string-union of the 4 reasons.

The `client.chats.getMedia()` method already existed; this release just
fleshes out its response shape so consumers can detect preview-fidelity
fallback and unavailable-bytes states without a separate retry.

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
