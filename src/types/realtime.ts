import { z } from "zod";

/** Response of `POST /v1/realtime/token`: MQTT-over-WebSocket credentials. */
export const RealtimeTokenSchema = z.object({
  /** MQTT-over-WebSocket URL to connect to, e.g. `wss://mqtt.blueticks.co:443/mqtt`. */
  brokerUrl: z.string(),
  /** MQTT username (your user id) — send exactly as given. */
  username: z.string(),
  /** JWT to send as the MQTT password. */
  password: z.string(),
  /** When the token stops being accepted (ISO 8601). */
  expiresAt: z.string().datetime({ offset: true }),
  /** Lifetime in seconds. */
  expiresInSeconds: z.number().int(),
  /** The topics this token can subscribe to. */
  topics: z.object({
    /** Inbound WhatsApp messages for this account. */
    messages: z.string(),
  }),
});

export type RealtimeToken = z.infer<typeof RealtimeTokenSchema>;
