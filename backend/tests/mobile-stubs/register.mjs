import { register } from "node:module";
globalThis.__DEV__ = false;
register("./hooks.mjs", import.meta.url);
