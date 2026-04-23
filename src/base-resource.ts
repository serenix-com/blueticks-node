// src/base-resource.ts
import type { Blueticks } from "./client";

export class BaseResource {
  protected readonly client: Blueticks;

  constructor(client: Blueticks) {
    this.client = client;
  }
}
