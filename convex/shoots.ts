import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { isValidReadToken } from "./lib/readToken";

function checkAdmin(token: string) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || token !== secret) {
    throw new Error("Unauthorized");
  }
}

const isPublished = (shoot: Doc<"shoots">) => shoot.published !== false;

// Shoots avec leurs photos/vidéos (URLs résolues), dans l'ordre d'affichage
async function withItems(ctx: QueryCtx, shoots: Doc<"shoots">[]) {
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
        published: isPublished(shoot),
        items: resolvedItems,
      };
    })
  );
}

// Site public : les brouillons ne sortent jamais de Convex
export const list = query({
  args: {},
  handler: async (ctx) => {
    const shoots = await ctx.db.query("shoots").withIndex("by_order").order("asc").collect();
    return withItems(ctx, shoots.filter(isPublished));
  },
});

// Back office : tous les shoots, brouillons compris (jeton de lecture requis)
export const listAll = query({
  args: { readToken: v.string() },
  handler: async (ctx, { readToken }) => {
    if (!isValidReadToken(readToken)) throw new Error("Unauthorized");
    const shoots = await ctx.db.query("shoots").withIndex("by_order").order("asc").collect();
    return withItems(ctx, shoots);
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    // Le nouveau back office crée les shoots en brouillon ; sans précision, ils sont en ligne
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, { token, title, summary, published }) => {
    checkAdmin(token);
    const shoots = await ctx.db.query("shoots").collect();
    const maxOrder = shoots.reduce((m, s) => Math.max(m, s.order), 0);
    return await ctx.db.insert("shoots", {
      title: title ?? "",
      summary,
      ...(published === undefined ? {} : { published }),
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
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, { token, id, title, summary, published }) => {
    checkAdmin(token);
    const patch: Record<string, unknown> = {};
    if (title !== undefined) patch.title = title;
    if (summary !== undefined) patch.summary = summary;
    if (published !== undefined) patch.published = published;
    await ctx.db.patch(id, patch);
  },
});

// Supprime le fichier en stockage UNIQUEMENT s'il n'est référencé par aucun
// autre item encore existant. Évite de casser un fichier partagé par erreur
// (cause du bug du 26/10 : des items de démo pointaient tous vers le même
// fichier, et en supprimer un cassait les autres).
async function deleteStorageIfUnused(
  ctx: MutationCtx,
  storageId: string,
  excludeItemId?: Id<"items">
) {
  const stillUsed = await ctx.db
    .query("items")
    .filter((q) =>
      excludeItemId
        ? q.and(q.eq(q.field("storageId"), storageId), q.neq(q.field("_id"), excludeItemId))
        : q.eq(q.field("storageId"), storageId)
    )
    .first();
  if (stillUsed) return;
  try {
    // storageId est stocké en string dans le schéma : on le type comme Id de fichier
    await ctx.storage.delete(storageId as Id<"_storage">);
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
