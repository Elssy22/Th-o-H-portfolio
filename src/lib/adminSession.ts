import { createHash } from "crypto";

export const SESSION_COOKIE = "admin_session";

export function sessionValue(): string {
  const secret = process.env.ADMIN_SECRET ?? "";
  return createHash("sha256").update(secret).digest("hex");
}

// Jeton de lecture des brouillons, transmis au navigateur du back office.
// Doit donner exactement la même valeur que convex/lib/readToken.ts.
export function readToken(): string {
  const secret = process.env.ADMIN_SECRET ?? "";
  return createHash("sha256").update("read:" + secret).digest("hex");
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  return cookieValue === sessionValue();
}
