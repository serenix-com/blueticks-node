import { z } from "zod";

export const IdentityTypeSchema = z.enum(["user", "group", "unknown"]);

export type IdentityType = z.infer<typeof IdentityTypeSchema>;

export const IdentitySourceSchema = z.enum(["engine", "cache", "unknown"]);

export type IdentitySource = z.infer<typeof IdentitySourceSchema>;

/**
 * A WhatsApp JID resolved to its canonical phone-form identity. An unknown
 * identity is returned with `resolved: false` (fail closed), never as an error.
 */
export const IdentitySchema = z.object({
  /** The JID as received, echoed verbatim. */
  input: z.string(),
  /** true = authoritative canonical identity; false = unknown. */
  resolved: z.boolean(),
  /** The phone-form JID (`<digits>@c.us`); null when unresolved. */
  canonical: z.string().nullish(),
  /** Digits only, no suffix; null when unresolved or for a group. */
  phone: z.string().nullish(),
  /** The `@lid` form when known. */
  lid: z.string().nullish(),
  /** Every equivalent JID for this identity, including `input`. */
  aliases: z.array(z.string()),
  type: IdentityTypeSchema,
  source: IdentitySourceSchema,
});

export type Identity = z.infer<typeof IdentitySchema>;

/** Response of `POST /v1/identity/resolve` (one entry per input id, in order). */
export const ResolveIdentitiesResultSchema = z.object({
  data: z.array(IdentitySchema),
});

export type ResolveIdentitiesResult = z.infer<typeof ResolveIdentitiesResultSchema>;
