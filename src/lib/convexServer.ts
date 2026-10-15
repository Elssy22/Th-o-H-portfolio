import { ConvexHttpClient } from "convex/browser";

export function getConvexServerClient() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);
}
