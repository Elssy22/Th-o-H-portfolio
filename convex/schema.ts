import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  shoots: defineTable({
    title: v.string(),
    summary: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_order", ["order"]),

  items: defineTable({
    shootId: v.optional(v.id("shoots")),
    storageId: v.string(),
    type: v.union(v.literal("image"), v.literal("video")),
    caption: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_order", ["order"])
    .index("by_shoot", ["shootId", "order"]),
});
