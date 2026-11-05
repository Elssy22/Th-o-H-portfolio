// « 9 photos · 1 vidéo », ou « Vide »
export function countLabel(items: { type: "image" | "video" }[]) {
  const photos = items.filter((i) => i.type === "image").length;
  const videos = items.length - photos;
  const parts = [];
  if (photos) parts.push(`${photos} photo${photos > 1 ? "s" : ""}`);
  if (videos) parts.push(`${videos} vidéo${videos > 1 ? "s" : ""}`);
  return parts.join(" · ") || "Vide";
}
