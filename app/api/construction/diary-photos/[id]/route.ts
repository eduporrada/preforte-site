import { ensureDatabase } from "../../../../../db/runtime";
import { getMediaBucket } from "../../../../../db/storage";

export const runtime = "edge";

type DiaryPhotoRow = {
  object_key: string;
  original_name: string;
  content_type: string;
  byte_size: number;
};

function contentDisposition(filename: string) {
  const fallback = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 100) || "foto-diario";
  return `inline; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!id || id.length > 128) {
    return Response.json({ error: "Foto invalida." }, { status: 400 });
  }

  const db = await ensureDatabase();
  const metadata = await db
    .prepare(`SELECT object_key, original_name, content_type, byte_size
      FROM construction_diary_photos WHERE id = ?`)
    .bind(id)
    .first<DiaryPhotoRow>();
  if (!metadata) return Response.json({ error: "Foto nao encontrada." }, { status: 404 });

  const object = await getMediaBucket().get(metadata.object_key);
  if (!object) return Response.json({ error: "Arquivo da foto nao encontrado." }, { status: 404 });

  const headers = new Headers({
    "Content-Type": metadata.content_type,
    "Content-Disposition": contentDisposition(metadata.original_name),
    "Cache-Control": "private, max-age=3600",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
  });
  const byteSize = object.size ?? metadata.byte_size;
  if (Number.isFinite(byteSize) && byteSize >= 0) headers.set("Content-Length", String(byteSize));
  if (object.etag) headers.set("ETag", object.etag);
  if (object.etag && request.headers.get("If-None-Match") === object.etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(object.body, { headers });
}
