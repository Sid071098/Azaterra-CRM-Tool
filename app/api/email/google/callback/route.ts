import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeCodeForTokens, getGoogleEmail } from "@/lib/gmail";
import { saveOwnerGmail } from "@/lib/ownerGmail";

const STATE_COOKIE = "azaterra.google_oauth_state";
const RETURN_COOKIE = "azaterra.google_oauth_return_to";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = req.cookies.get(STATE_COOKIE)?.value;
  const returnTo = safeReturnPath(req.cookies.get(RETURN_COOKIE)?.value);

  if (!code || !state || !savedState || state !== savedState) {
    return redirectWithStatus(req, "gmail=error", returnTo);
  }

  const actor = state.split(".")[0];
  const [actorType, actorId] = actor.split(":");
  if (!actorType || !actorId) return redirectWithStatus(req, "gmail=error", returnTo);

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) return redirectWithStatus(req, "gmail=no_refresh_token", returnTo);

    const googleEmail = await getGoogleEmail(tokens.access_token);
    if (actorType === "owner") {
      await saveOwnerGmail(actorId, googleEmail, tokens.refresh_token);
    } else if (actorType === "rep") {
      await prisma.salesPerson.update({
        where: { id: actorId },
        data: {
          googleEmail,
          googleRefreshToken: tokens.refresh_token,
          googleConnectedAt: new Date(),
        },
      });
    } else {
      return redirectWithStatus(req, "gmail=error", returnTo);
    }

    return redirectWithStatus(req, "gmail=connected", returnTo);
  } catch {
    return redirectWithStatus(req, "gmail=error", returnTo);
  }
}

function redirectWithStatus(req: NextRequest, query: string, returnTo: string) {
  const redirectTo = new URL(returnTo, req.url);
  redirectTo.search = query;
  const res = NextResponse.redirect(redirectTo);
  res.cookies.set({ name: STATE_COOKIE, value: "", path: "/", maxAge: 0 });
  res.cookies.set({ name: RETURN_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}

function safeReturnPath(value: string | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
