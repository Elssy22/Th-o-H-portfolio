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
    if (!item) return;
    await ctx.db.delete(id);

    // Le fichier n'est supprimé que si aucun autre item ne le référence
    // encore. Protège contre un storageId partagé par erreur entre plusieurs
    // items (cause du bug du 26/10 : supprimer un item cassait la photo d'un
    // autre qui pointait vers le même fichier). On ne bloque jamais la
    // suppression de la fiche pour autant.
    const stillUsed = await ctx.db
      .query("items")
      .filter((q) => q.eq(q.field("storageId"), item.storageId))
      .first();
    if (!stillUsed) {
      try {
        await ctx.storage.delete(item.storageId);
      } catch {
        // fichier déjà absent : rien à faire
      }
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

