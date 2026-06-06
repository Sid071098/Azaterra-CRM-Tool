import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/gmail";
import { readSession } from "@/lib/session";

const STATE_COOKIE = "azaterra.google_oauth_state";
const RETURN_COOKIE = "azaterra.google_oauth_return_to";

export async function GET(req: NextRequest) {
  const session = readSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in before connecting Gmail." },
      { status: 403 },
    );
  }

  const actor =
    session.role === "Owner" && session.ownerId
      ? `owner:${session.ownerId}`
      : session.role === "SalesRep" && session.salesPersonId
        ? `rep:${session.salesPersonId}`
        : null;

  if (!actor) {
    return NextResponse.json(
      { error: "Your account is missing the profile needed to connect Gmail." },
      { status: 403 },
    );
  }

  const state = `${actor}.${randomBytes(24).toString("hex")}`;
  const returnTo = safeReturnPath(new URL(req.url).searchParams.get("next"));
  const res = NextResponse.redirect(buildGoogleAuthUrl(state));
  res.cookies.set({
    name: STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  res.cookies.set({
    name: RETURN_COOKIE,
    value: returnTo,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}

function safeReturnPath(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
