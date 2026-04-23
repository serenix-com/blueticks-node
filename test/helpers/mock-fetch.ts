// test/helpers/mock-fetch.ts
export type MockHandler = (req: Request) => Response | Promise<Response>;

export function mockFetch(handler: MockHandler): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const req = new Request(url, init);
    return handler(req);
  }) as typeof fetch;
}

export function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}
