# Changelog

All notable changes to `blueticks` (Node/TS SDK) are documented here. Follows
[Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/).

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
