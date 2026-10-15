import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function checkAdmin(token: string) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || token !== secret) {
    throw new Error("Unauthorized");
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const shoots = await ctx.db.query("shoots").withIndex("by_order").order("asc").collect();
    return Promise.all(
      shoots.map(async (shoot) => {
        const items = await ctx.db
          .query("items")
          .withIndex("by_shoot", (q) => q.eq("shootId", shoot._id))
          .order("asc")
          .collect();
        const resolvedItems = await Promise.all(
          items.map(async (item) => ({
            _id: item._id,
            type: item.type,
            order: item.order,
            url: await ctx.storage.getUrl(item.storageId),
          }))
        );
        return {
          _id: shoot._id,
          title: shoot.title,
          summary: shoot.summary ?? "",
          order: shoot.order,
          items: resolvedItems,
        };
      })
    );
  },
});

export const create = mutation({
  args: { token: v.string(), title: v.optional(v.string()), summary: v.optional(v.string()) },
  handler: async (ctx, { token, title, summary }) => {
    checkAdmin(token);
    const shoots = await ctx.db.query("shoots").collect();
    const maxOrder = shoots.reduce((m, s) => Math.max(m, s.order), 0);
    return await ctx.db.insert("shoots", {
      title: title ?? "",
      summary,
      order: maxOrder + 1,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("shoots"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, { token, id, title, summary }) => {
    checkAdmin(token);
    const patch: Record<string, unknown> = {};
    if (title !== undefined) patch.title = title;
    if (summary !== undefined) patch.summary = summary;
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("shoots") },
  handler: async (ctx, { token, id }) => {
    checkAdmin(token);
    const items = await ctx.db
      .query("items")
      .withIndex("by_shoot", (q) => q.eq("shootId", id))
      .collect();
    for (const item of items) {
      await ctx.storage.delete(item.storageId);
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(id);
  },
});

export const reorder = mutation({
  args: { token: v.string(), orderedIds: v.array(v.id("shoots")) },
  handler: async (ctx, { token, orderedIds }) => {
    checkAdmin(token);
    await Promise.all(orderedIds.map((id, idx) => ctx.db.patch(id, { order: idx })));
  },
});

// Utilitaire ponctuel : applique le même résumé à tous les shoots (placeholder de test).
export const bulkSetSummary = mutation({
  args: { token: v.string(), summary: v.string() },
  handler: async (ctx, { token, summary }) => {
    checkAdmin(token);
    const shoots = await ctx.db.query("shoots").collect();
    await Promise.all(shoots.map((s) => ctx.db.patch(s._id, { summary })));
    return { updated: shoots.length };
  },
});

// Utilitaire ponctuel (démo) : duplique la photo de couverture de chaque shoot
// pour atteindre 5 exemplaires, afin de visualiser la navigation galerie.
export const duplicateCoverInAllShoots = mutation({
  args: { token: v.string(), targetCount: v.number() },
  handler: async (ctx, { token, targetCount }) => {
    checkAdmin(token);
    const shoots = await ctx.db.query("shoots").collect();
    let added = 0;
    for (const shoot of shoots) {
      const items = await ctx.db
        .query("items")
        .withIndex("by_shoot", (q) => q.eq("shootId", shoot._id))
        .order("asc")
        .collect();
      if (items.length === 0) continue;
      const cover = items[0];
      let order = items.reduce((m, i) => Math.max(m, i.order), 0);
      const missing = targetCount - items.length;
      for (let i = 0; i < missing; i++) {
        order += 1;
        await ctx.db.insert("items", {
          shootId: shoot._id,
          storageId: cover.storageId,
          type: cover.type,
          order,
          createdAt: Date.now(),
        });
        added += 1;
      }
    }
    return { added };
  },
});
