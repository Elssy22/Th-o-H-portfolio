import type { Id } from "../../../convex/_generated/dataModel";

// Appels aux routes /api/admin/* : une erreur est levée si la réponse n'est pas OK,
// pour que l'interface puisse l'afficher au lieu d'échouer en silence.
async function send<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(res.status === 401 ? "session" : `http ${res.status}`);
  return res.json() as Promise<T>;
}

export const adminApi = {
  createShoot: (title: string) =>
    send<{ ok: true; id: Id<"shoots"> }>("/api/admin/shoots", "POST", { title, summary: "" }),
  updateShoot: (id: Id<"shoots">, title: string, summary: string) =>
    send("/api/admin/shoots", "PATCH", { id, title, summary }),
  deleteShoot: (id: Id<"shoots">) => send("/api/admin/shoots", "DELETE", { id }),
  reorderShoots: (orderedIds: string[]) => send("/api/admin/shoots-reorder", "POST", { orderedIds }),
  reorderItems: (orderedIds: string[]) => send("/api/admin/reorder", "POST", { orderedIds }),
  deleteItem: (id: Id<"items">) => send("/api/admin/items", "DELETE", { id }),
  logout: () => send("/api/admin/logout", "POST"),
};

// Envoie un fichier dans le stockage Convex puis le rattache au shoot.
// XHR plutôt que fetch pour pouvoir suivre la progression de l'envoi.
export async function uploadMedia(
  file: File,
  shootId: Id<"shoots">,
  onProgress: (ratio: number) => void
) {
  const { uploadUrl } = await send<{ uploadUrl: string }>("/api/admin/upload-url", "GET");

  const storageId = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      try {
        if (xhr.status < 200 || xhr.status >= 300) throw new Error();
        resolve(JSON.parse(xhr.responseText).storageId);
      } catch {
        reject(new Error("upload"));
      }
    };
    xhr.onerror = () => reject(new Error("upload"));
    xhr.send(file);
  });

  const type = file.type.startsWith("video") ? "video" : "image";
  await send("/api/admin/items", "POST", { storageId, type, shootId });
}
