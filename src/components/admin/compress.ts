// Prépare une photo avant l'envoi : redimensionnée à 2400 px sur le plus grand côté
// et réencodée en JPEG. Un fichier de boîtier de 15-30 Mo tombe autour de 1 Mo,
// ce qui accélère l'envoi (surtout en 4G) et l'affichage du site.
//
// En cas de doute, on envoie l'original plutôt que de risquer une photo abîmée :
// format illisible par le navigateur, résultat plus lourd que l'original, etc.
// Les métadonnées (EXIF, GPS) ne sont pas recopiées : la position de prise de vue
// ne part donc pas sur le site.

const MAX_SIDE = 2400;
const QUALITY = 0.86;
// En dessous de ce poids, une photo déjà à la bonne taille est envoyée telle quelle
const SMALL_ENOUGH = 1.5 * 1024 * 1024;

export async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || /gif|svg/.test(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    // "from-image" applique l'orientation EXIF : une photo prise en portrait reste en portrait
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SMALL_ENOUGH) return file;

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // Fond noir (celui du site) pour les PNG transparents, le JPEG n'ayant pas de transparence
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}

export function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.round(bytes / 1024)} Ko`;
}
