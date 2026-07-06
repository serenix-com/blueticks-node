import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({
    apiKey: "bt_test_x",
    baseUrl: "https://example.test",
    fetch: mockFetch(handler),
  });
}

function authErr() {
  return jsonResponse(401, {
    error: { code: "authentication_required", message: "bad key", requestId: "req_a" },
  });
}

function baseClip(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "clip_abc",
    status: "complete",
    audioUrl: "https://cdn.suno.test/clip_abc.mp3",
    imageUrl: "https://cdn.suno.test/clip_abc.png",
    title: "Morning Road",
    durationSec: 123.4,
    model: "v5.5",
    ...overrides,
  };
}

describe("client.suno.generateSong", () => {
  it("POSTs /v1/suno/songs and returns the generation", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/suno/songs");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body["lyrics"]).toBe("[Verse]\nSunlight");
      expect(body["style"]).toBe("upbeat pop");
      expect(body["vocalGender"]).toBe("f");
      return jsonResponse(200, {
        jobId: "job_1",
        clips: [baseClip({ id: "clip_1", status: "queued", audioUrl: null, imageUrl: null, durationSec: null }), baseClip({ id: "clip_2" })],
      });
    });
    const r = await c.suno.generateSong({
      lyrics: "[Verse]\nSunlight",
      style: "upbeat pop",
      vocalGender: "f",
      weirdness: 0.4,
      styleInfluence: 0.7,
    });
    expect(r.jobId).toBe("job_1");
    expect(r.clips).toHaveLength(2);
    expect(r.clips[0]?.id).toBe("clip_1");
    expect(r.clips[0]?.status).toBe("queued");
    expect(r.clips[1]?.audioUrl).toBe("https://cdn.suno.test/clip_abc.mp3");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.suno
      .generateSong({ lyrics: "x", style: "y" })
      .catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.code).toBe("authentication_required");
    expect(err.requestId).toBe("req_a");
  });

  it("raises ValidationError when response is missing required fields", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(
      c.suno.generateSong({ lyrics: "x", style: "y" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.suno.getSong", () => {
  it("GETs /v1/suno/songs/:id and returns the clip", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/suno/songs/clip_abc");
      return jsonResponse(200, baseClip());
    });
    const clip = await c.suno.getSong("clip_abc");
    expect(clip.id).toBe("clip_abc");
    expect(clip.status).toBe("complete");
    expect(clip.durationSec).toBe(123.4);
  });

  it("accepts an errored clip with nullable error fields", async () => {
    const c = mkClient(() =>
      jsonResponse(200, baseClip({
        status: "error",
        audioUrl: null,
        imageUrl: null,
        durationSec: null,
        errorType: "moderation_failure",
        errorMessage: "Your lyrics contain copyrighted material",
      })),
    );
    const clip = await c.suno.getSong("clip_abc");
    expect(clip.status).toBe("error");
    expect(clip.errorType).toBe("moderation_failure");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.suno.getSong("clip_abc").catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it("raises ValidationError when required field is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.suno.getSong("clip_abc")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.suno.uploadAudio", () => {
  it("POSTs /v1/suno/uploads and returns the upload ref", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/suno/uploads");
      const body = (await req.json()) as Record<string, unknown>;
      expect(body["audioUrl"]).toBe("https://example.com/me.mp3");
      return jsonResponse(200, { uploadId: "up_1", status: "complete" });
    });
    const r = await c.suno.uploadAudio({
      audioUrl: "https://example.com/me.mp3",
      fileName: "me.mp3",
    });
    expect(r.uploadId).toBe("up_1");
    expect(r.status).toBe("complete");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.suno.uploadAudio({ audioUrl: "https://x/y.mp3" }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it("raises ValidationError when required field is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.suno.uploadAudio({})).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.suno.getAccount", () => {
  it("GETs /v1/suno/account and returns usage", async () => {
    const c = mkClient((req) => {
      expect(req.method).toBe("GET");
      expect(new URL(req.url).pathname).toBe("/v1/suno/account");
      return jsonResponse(200, {
        creditsLeft: 420,
        monthlyLimit: 2000,
        monthlyUsage: 1580,
        plan: "Pro Plan",
      });
    });
    const a = await c.suno.getAccount();
    expect(a.creditsLeft).toBe(420);
    expect(a.plan).toBe("Pro Plan");
  });

  it("accepts null monthly fields and plan", async () => {
    const c = mkClient(() =>
      jsonResponse(200, { creditsLeft: 5, monthlyLimit: null, monthlyUsage: null, plan: null }),
    );
    const a = await c.suno.getAccount();
    expect(a.monthlyLimit).toBeNull();
    expect(a.plan).toBeNull();
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() => authErr());
    const err = await c.suno.getAccount().catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  it("raises ValidationError when required field is missing", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.suno.getAccount()).rejects.toBeInstanceOf(ValidationError);
  });
});
