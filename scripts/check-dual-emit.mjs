// scripts/check-dual-emit.mjs
// Verifies the built dist/ works in both ESM and CJS.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const esmCheck = `import('./dist/index.js').then(m => { if (typeof m.Blueticks !== 'function') { process.exit(1); } else { console.log('esm ok'); } })`;
execSync(`node --input-type=module -e "${esmCheck}"`, { stdio: "inherit" });

const cjsCheck = `const m = require('./dist/index.cjs'); if (typeof m.Blueticks !== 'function') { process.exit(1); } else { console.log('cjs ok'); }`;
execSync(`node --input-type=commonjs -e "${cjsCheck}"`, { stdio: "inherit" });
