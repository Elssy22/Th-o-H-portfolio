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

// Supprime le fichier en stockage UNIQUEMENT s'il n'est référencé par aucun
// autre item encore existant. Évite de casser un fichier partagé par erreur
// (cause du bug du 26/10 : des items de démo pointaient tous vers le même
// fichier, et en supprimer un cassait les autres).
async function deleteStorageIfUnused(
  ctx: { db: any; storage: any },
  storageId: string,
  excludeItemId?: string
) {
  const stillUsed = await ctx.db
    .query("items")
    .filter((q: any) =>
      excludeItemId
        ? q.and(q.eq(q.field("storageId"), storageId), q.neq(q.field("_id"), excludeItemId))
        : q.eq(q.field("storageId"), storageId)
    )
    .first();
  if (stillUsed) return;
  try {
    await ctx.storage.delete(storageId);
  } catch {
    // déjà absent, rien à faire
  }
}

export const remove = mutation({
  args: { token: v.string(), id: v.id("shoots") },
  handler: async (ctx, { token, id }) => {
    checkAdmin(token);
    const items = await ctx.db
      .query("items")
      .withIndex("by_shoot", (q) => q.eq("shootId", id))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
      await deleteStorageIfUnused(ctx, item.storageId, item._id);
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

// Vide entièrement le portfolio (shoots + items + fichiers) pour repartir de
// zéro. Demande explicite de l'utilisateur uniquement.
export const wipeAll = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    checkAdmin(token);
    const items = await ctx.db.query("items").collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
      try {
        await ctx.storage.delete(item.storageId);
      } catch {
        // déjà absent
      }
    }
    const shoots = await ctx.db.query("shoots").collect();
    for (const shoot of shoots) {
      await ctx.db.delete(shoot._id);
    }
    return { deletedShoots: shoots.length, deletedItems: items.length };
  },
});
