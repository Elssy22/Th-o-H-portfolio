import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidSession } from "@/lib/adminSession";
import { getConvexServerClient } from "@/lib/convexServer";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (!isValidSession(cookieStore.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { orderedIds } = await req.json();
  const convex = getConvexServerClient();
  await convex.mutation(api.shoots.reorder, {
    token: process.env.ADMIN_SECRET as string,
    orderedIds: orderedIds as Id<"shoots">[],
  });
  return NextResponse.json({ ok: true });
}
