import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const source = resolve(projectRoot, "public", "_headers");
const destination = resolve(projectRoot, "dist", "_headers");

await mkdir(resolve(projectRoot, "dist"), { recursive: true });
await copyFile(source, destination);

console.log("Copied static security headers to dist/_headers");
