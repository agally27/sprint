import { handle } from "hono/vercel";
import { createApp } from "../src/index";

/** Vercel serverless entry. */
export const runtime = "nodejs";
const app = createApp();
export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
