import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidSession } from "@/lib/adminSession";
import { getConvexServerClient } from "@/lib/convexServer";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

async function requireAuth() {
  const cookieStore = await cookies();
  return isValidSession(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { storageId, type, shootId } = await req.json();
  const convex = getConvexServerClient();
  await convex.mutation(api.items.addToShoot, {
    token: process.env.ADMIN_SECRET as string,
    storageId,
    type,
    shootId: shootId as Id<"shoots">,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { id } = await req.json();
  const convex = getConvexServerClient();
  await convex.mutation(api.items.deleteItem, {
    token: process.env.ADMIN_SECRET as string,
    id: id as Id<"items">,
  });
  return NextResponse.json({ ok: true });
}
