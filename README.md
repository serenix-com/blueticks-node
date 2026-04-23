# blueticks — Node/TypeScript client for the Blueticks API

Official Node.js SDK for [Blueticks](https://blueticks.co).

## Install

```bash
npm install blueticks
```

## Quickstart

```ts
import { Blueticks } from "blueticks";

const client = new Blueticks({ apiKey: "bt_live_..." });
const ping = await client.ping();
const account = await client.account.retrieve();
console.log(account.name);
```

See https://docs.blueticks.co for full documentation.

## Supported runtimes

Node.js 18, 20, and 22. ESM and CommonJS.
