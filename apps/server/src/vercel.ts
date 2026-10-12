import { getRequestListener } from "@hono/node-server";
import { createApp } from "./index";

/**
 * Vercel entry. Bundled by scripts/build-vercel.mjs into a single JavaScript
 * file, so Vercel never has to compile this TypeScript or the @sprint/core
 * workspace package. Exports a plain Node (req, res) handler.
 */
export default getRequestListener(createApp().fetch);
