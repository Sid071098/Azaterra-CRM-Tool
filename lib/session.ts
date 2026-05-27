import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  parseSessionCookie,
  serializeSession,
  type AppRole,
  type AppSession,
} from "./sessionCookie";

export { SESSION_COOKIE, parseSessionCookie, serializeSession };
export type { AppRole, AppSession };

export function readSession(): AppSession | null {
  return parseSessionCookie(cookies().get(SESSION_COOKIE)?.value);
}
