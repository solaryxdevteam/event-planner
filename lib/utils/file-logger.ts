import fs from "node:fs";
import path from "node:path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "errors.log");

function formatErrorEntry(route: string, error: unknown): string {
  const timestamp = new Date().toISOString();
  const err = error instanceof Error ? error : new Error(String(error));
  const message = err.message;
  const stack = err.stack ?? "(no stack)";
  const name = err.name;
  const extra =
    error instanceof Error && "cause" in err && err.cause !== undefined
      ? `\ncause: ${err.cause instanceof Error ? err.cause.stack : String(err.cause)}`
      : "";
  return [
    "---",
    `[${timestamp}] ${route}`,
    `name: ${name}`,
    `message: ${message}`,
    `stack:\n${stack}${extra}`,
    "",
  ].join("\n");
}

/**
 * Appends a full error log entry to logs/errors.log (creates logs dir if needed).
 * Safe to call from API routes; catches write errors so it never throws.
 */
export function logErrorToFile(route: string, error: unknown): void {
  const entry = formatErrorEntry(route, error);
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, entry, "utf8");
  } catch (writeErr) {
    console.error("Failed to write error log to file:", writeErr);
  }
}
