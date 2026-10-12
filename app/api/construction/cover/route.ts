import { ensureDatabase } from "../../../../db/runtime";
import { getMediaBucket } from "../../../../db/storage";

export const runtime = "edge";

const MAX_COVER_BYTES = 8 * 1024 * 1024;

type CoverRow = {
  project_id: string;
  object_key: string;
  content_type: string;
  updated_at: string;
};

export async function GET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("projectId")?.trim() ?? "";
  if (!projectId) return Response.json({ error: "Obra não informada." }, { status: 400 });
  const db = await ensureDatabase();
  const cover = await db.prepare("SELECT * FROM construction_covers WHERE project_id = ?").bind(projectId).first<CoverRow>();
  if (!cover) return new Response(null, { status: 404 });
  const object = await getMediaBucket().get(cover.object_key);
  if (!object) return new Response(null, { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": cover.content_type,
      "Cache-Control": "public, max-age=3600",
      ETag: object.httpEtag,
    },
  });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Envie a foto como formulário." }, { status: 400 });
  }
  const projectId = String(form.get("projectId") ?? "").trim();
  const file = form.get("cover");
  if (!projectId || !(file instanceof File)) return Response.json({ error: "Obra e foto são obrigatórias." }, { status: 400 });
  if (!file.type.startsWith("image/") || file.size <= 0 || file.size > MAX_COVER_BYTES) {
    return Response.json({ error: "Use uma imagem de até 8 MB." }, { status: 400 });
  }
  const db = await ensureDatabase();
  const project = await db.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first<{ id: string }>();
  if (!project) return Response.json({ error: "Obra não encontrada." }, { status: 404 });
  const previous = await db.prepare("SELECT object_key FROM construction_covers WHERE project_id = ?").bind(projectId).first<{ object_key: string }>();
  const objectKey = `construction-covers/${projectId}/${crypto.randomUUID()}`;
  const bucket = getMediaBucket();
  await bucket.put(objectKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { projectId },
  });
  try {
    await db.prepare(`INSERT INTO construction_covers (project_id, object_key, content_type, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(project_id) DO UPDATE SET object_key = excluded.object_key, content_type = excluded.content_type, updated_at = excluded.updated_at`)
      .bind(projectId, objectKey, file.type, new Date().toISOString()).run();
  } catch (error) {
    await bucket.delete(objectKey);
    throw error;
  }
  if (previous?.object_key && previous.object_key !== objectKey) await bucket.delete(previous.object_key);
  return Response.json({ url: `/api/construction/cover?projectId=${encodeURIComponent(projectId)}` });
}
