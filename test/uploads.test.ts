import { describe, it, expect } from "vitest";
import { Blueticks, AuthenticationError, ValidationError } from "../src";
import { mockFetch, jsonResponse } from "./helpers/mock-fetch";

function mkClient(handler: Parameters<typeof mockFetch>[0]): Blueticks {
  return new Blueticks({ apiKey: "bt_test_x", baseUrl: "https://example.test", fetch: mockFetch(handler) });
}

const UPLOAD = {
  fileId: "Ab12Cd34Ef56",
  uploadUrl: "https://storage.example.test/signed?sig=abc",
  method: "PUT",
  headers: { "Content-Type": "application/pdf", "x-goog-content-length-range": "0,16777216" },
  expiresAt: "2026-11-08T10:15:00Z",
  deleteAt: "2026-11-09T10:00:00Z",
  maxBytes: 16777216,
  contentType: "application/pdf",
};

describe("client.uploads.create", () => {
  it("posts the content type and returns the signed upload link", async () => {
    const c = mkClient(async (req) => {
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/v1/uploads");
      expect(await req.json()).toEqual({ contentType: "application/pdf", sizeBytes: 2048, filename: "invoice.pdf" });
      return jsonResponse(201, { success: true, data: UPLOAD });
    });
    const res = await c.uploads.create({
      contentType: "application/pdf",
      sizeBytes: 2048,
      filename: "invoice.pdf",
    });
    expect(res.fileId).toBe("Ab12Cd34Ef56");
    expect(res.method).toBe("PUT");
    expect(res.headers["Content-Type"]).toBe("application/pdf");
    expect(res.maxBytes).toBe(16777216);
  });

  it("propagates AuthenticationError on 401", async () => {
    const c = mkClient(() =>
      jsonResponse(401, { error: { code: "authentication_required", message: "no", requestId: "req_u" } }),
    );
    const err = await c.uploads.create({ contentType: "image/jpeg" }).catch((e) => e);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.requestId).toBe("req_u");
  });

  it("raises ValidationError on {}", async () => {
    const c = mkClient(() => jsonResponse(200, {}));
    await expect(c.uploads.create({ contentType: "image/jpeg" })).rejects.toBeInstanceOf(ValidationError);
  });
});
