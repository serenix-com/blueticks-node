import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

const CLIP = {
  id: "clip_1",
  status: "complete",
  audioUrl: "https://cdn.test/song.mp3",
  imageUrl: "https://cdn.test/cover.jpg",
  title: "Test Song",
  durationSec: 123.4,
  model: "v5.5",
};

describe("client.suno.generateSong", () => {
  it("posts lyrics + style and returns clips", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/suno/songs");
      const body = await req.json();
      expect(body).toEqual({ lyrics: "la la", style: "pop" });
      return jsonResponse(200, {
        success: true,
        data: { jobId: "job_1", clips: [CLIP, { id: "clip_2", status: "queued" }] },
      });
    });
    const res = await c.suno.generateSong({ lyrics: "la la", style: "pop" });
    expect(res.jobId).toBe("job_1");
    expect(res.clips[0]!.audioUrl).toBe("https://cdn.test/song.mp3");
    expect(res.clips[1]!.status).toBe("queued");
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_su" } }),
    );
    const err = await c.suno.generateSong({ lyrics: "x", style: "y" }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_su");
  });

  it("raises ValidationError on malformed envelope", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.suno.generateSong({ lyrics: "x", style: "y" })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("client.suno.getSong", () => {
  it("returns a single clip", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/suno/songs/clip_1");
      return jsonResponse(200, { success: true, data: CLIP });
    });
    const res = await c.suno.getSong("clip_1");
    expect(res.status).toBe("complete");
    expect(res.durationSec).toBe(123.4);
  });
});

describe("client.suno.uploadReference", () => {
  it("returns an uploadId", async () => {
    const c = mkClient(async (req) => {
      expect(new URL(req.url).pathname).toBe("/v1/suno/uploads");
      const body = await req.json();
      expect(body).toEqual({ audioUrl: "https://cdn.test/in.mp3" });
      return jsonResponse(200, { success: true, data: { uploadId: "up_1", status: "complete" } });
    });
    const res = await c.suno.uploadReference({ audioUrl: "https://cdn.test/in.mp3" });
    expect(res.uploadId).toBe("up_1");
  });
});

describe("client.suno.account", () => {
  it("returns credit info", async () => {
    const c = mkClient((req) => {
      expect(new URL(req.url).pathname).toBe("/v1/suno/account");
      return jsonResponse(200, { success: true, data: { creditsLeft: 250, plan: "Pro Plan" } });
    });
    const res = await c.suno.account();
    expect(res.creditsLeft).toBe(250);
    expect(res.plan).toBe("Pro Plan");
  });
});
