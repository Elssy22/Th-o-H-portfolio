import { mutation } from "./_generated/server";
import { v } from "convex/values";

function checkAdmin(token: string) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || token !== secret) {
    throw new Error("Unauthorized");
  }
}

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    checkAdmin(token);
    return await ctx.storage.generateUploadUrl();
  },
});

export const addToShoot = mutation({
  args: {
    token: v.string(),
    shootId: v.id("shoots"),
    storageId: v.string(),
    type: v.union(v.literal("image"), v.literal("video")),
  },
  handler: async (ctx, { token, shootId, storageId, type }) => {
    checkAdmin(token);
    const items = await ctx.db
      .query("items")
      .withIndex("by_shoot", (q) => q.eq("shootId", shootId))
      .collect();
    const maxOrder = items.reduce((m, i) => Math.max(m, i.order), -1);
    await ctx.db.insert("items", {
      shootId,
      storageId,
      type,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });
  },
});

export const deleteItem = mutation({
  args: { token: v.string(), id: v.id("items") },
  handler: async (ctx, { token, id }) => {
    checkAdmin(token);
    const item = await ctx.db.get(id);
    if (item) {
      await ctx.storage.delete(item.storageId);
      await ctx.db.delete(id);
    }
  },
});

export const reorderWithinShoot = mutation({
  args: { token: v.string(), orderedIds: v.array(v.id("items")) },
  handler: async (ctx, { token, orderedIds }) => {
    checkAdmin(token);
    await Promise.all(orderedIds.map((id, idx) => ctx.db.patch(id, { order: idx })));
  },
});

// Migration unique : chaque item sans shootId reçoit son propre shoot.
export const migrateLegacyItemsToShoots = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    checkAdmin(token);
    const items = await ctx.db.query("items").withIndex("by_order").order("asc").collect();
    const orphans = items.filter((i) => i.shootId === undefined);
    let shootOrder = (await ctx.db.query("shoots").collect()).reduce(
      (m, s) => Math.max(m, s.order),
      0
    );
    let migrated = 0;
    for (const item of orphans) {
      shootOrder += 1;
      const shootId = await ctx.db.insert("shoots", {
        title: "",
        summary: "",
        order: shootOrder,
        createdAt: Date.now(),
      });
      await ctx.db.patch(item._id, { shootId, order: 0 });
      migrated += 1;
    }
    return { migrated };
  },
});
