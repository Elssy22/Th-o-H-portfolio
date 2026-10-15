import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidSession } from "@/lib/adminSession";
import { getConvexServerClient } from "@/lib/convexServer";
import { api } from "../../../../../convex/_generated/api";

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  if (!isValidSession(cookieStore.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const convex = getConvexServerClient();
  const uploadUrl = await convex.mutation(api.items.generateUploadUrl, {
    token: process.env.ADMIN_SECRET as string,
  });
  return NextResponse.json({ uploadUrl });
}
