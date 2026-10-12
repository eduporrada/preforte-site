import { ensureDatabase } from "../../../../db/runtime";
import { getMediaBucket } from "../../../../db/storage";

export const runtime = "edge";

const MAX_PHOTOS_PER_REQUEST = 6;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

type DiaryPhotoRow = {
  id: string;
  diary_id: string;
  project_id: string;
  object_key: string;
  original_name: string;
  content_type: string;
  byte_size: number;
  created_at: string;
};

type ValidatedPhoto = {
  id: string;
  objectKey: string;
  filename: string;
  contentType: string;
  bytes: ArrayBuffer;
  byteSize: number;
  createdAt: string;
};

function photoResponse(row: DiaryPhotoRow) {
  return {
    id: row.id,
    diary_id: row.diary_id,
    project_id: row.project_id,
    filename: row.original_name,
    content_type: row.content_type,
    byte_size: row.byte_size,
    created_at: row.created_at,
    url: `/api/construction/diary-photos/${encodeURIComponent(row.id)}`,
  };
}

function safeFilename(filename: string, contentType: string) {
  const extensionByType: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
  };
  const cleaned = filename
    .normalize("NFKC")
    .replace(/[\\/\u0000-\u001f\u007f]+/g, "-")
    .replace(/[^a-zA-Z0-9._ -]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100);
  if (cleaned && /\.[a-zA-Z0-9]{2,5}$/.test(cleaned)) return cleaned;
  return `${cleaned || "foto-diario"}${extensionByType[contentType] ?? ".jpg"}`;
}

function detectImageType(bytes: Uint8Array) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 16 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
    const brands = String.fromCharCode(...bytes.slice(8, Math.min(bytes.length, 32)));
    if (/(heic|heix|hevc|hevx)/.test(brands)) return "image/heic";
    if (/(mif1|msf1)/.test(brands)) return "image/heif";
  }
  return null;
}

async function validatePhoto(file: File): Promise<ValidatedPhoto> {
  if (file.size <= 0) throw new Error("Uma das fotos esta vazia.");
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Cada foto pode ter no maximo 8 MB.");
  }

  const bytes = await file.arrayBuffer();
  const detectedType = detectImageType(new Uint8Array(bytes));
  if (!detectedType) {
    throw new Error("Use somente fotos JPEG, PNG, WebP, HEIC ou HEIF.");
  }
  const declaredType = file.type === "image/jpg" ? "image/jpeg" : file.type.toLowerCase();
  if (declaredType && declaredType !== detectedType) {
    throw new Error("O conteudo de uma foto nao corresponde ao tipo informado.");
  }

  const id = crypto.randomUUID();
  return {
    id,
    objectKey: `construction-diary/${id}`,
    filename: safeFilename(file.name, detectedType),
    contentType: detectedType,
    bytes,
    byteSize: bytes.byteLength,
    createdAt: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId")?.trim() ?? "";
  const diaryId = url.searchParams.get("diaryId")?.trim() ?? "";
  if (!projectId && !diaryId) {
    return Response.json(
      { error: "Informe projectId ou diaryId para consultar as fotos." },
      { status: 400 },
    );
  }

  const db = await ensureDatabase();
  const query = projectId && diaryId
    ? db.prepare(`SELECT * FROM construction_diary_photos
        WHERE project_id = ? AND diary_id = ? ORDER BY created_at, id`).bind(projectId, diaryId)
    : projectId
      ? db.prepare(`SELECT * FROM construction_diary_photos
          WHERE project_id = ? ORDER BY created_at, id`).bind(projectId)
      : db.prepare(`SELECT * FROM construction_diary_photos
          WHERE diary_id = ? ORDER BY created_at, id`).bind(diaryId);
  const photos = await query.all<DiaryPhotoRow>();
  return Response.json({ photos: photos.results.map(photoResponse) });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Envie as fotos como formulario multipart." }, { status: 400 });
  }

  const projectId = String(form.get("projectId") ?? "").trim();
  const diaryId = String(form.get("diaryId") ?? "").trim();
  if (!projectId || !diaryId || projectId.length > 128 || diaryId.length > 128) {
    return Response.json({ error: "Obra e registro diario sao obrigatorios." }, { status: 400 });
  }

  const files = form.getAll("photos").filter((item): item is File => item instanceof File);
  if (!files.length) {
    return Response.json({ error: "Selecione ao menos uma foto." }, { status: 400 });
  }
  if (files.length > MAX_PHOTOS_PER_REQUEST) {
    return Response.json(
      { error: `Envie no maximo ${MAX_PHOTOS_PER_REQUEST} fotos por registro.` },
      { status: 400 },
    );
  }

  const db = await ensureDatabase();
  const diary = await db
    .prepare("SELECT id FROM construction_diary WHERE id = ? AND project_id = ?")
    .bind(diaryId, projectId)
    .first<{ id: string }>();
  if (!diary) {
    return Response.json({ error: "Registro diario nao encontrado nesta obra." }, { status: 404 });
  }

  let photos: ValidatedPhoto[];
  try {
    photos = await Promise.all(files.map(validatePhoto));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Uma das fotos e invalida." },
      { status: 400 },
    );
  }

  const bucket = getMediaBucket();
  const uploadedKeys: string[] = [];
  try {
    for (const photo of photos) {
      await bucket.put(photo.objectKey, photo.bytes, {
        httpMetadata: { contentType: photo.contentType },
        customMetadata: { projectId, diaryId, photoId: photo.id },
      });
      uploadedKeys.push(photo.objectKey);
    }
    await db.batch(
      photos.map((photo) =>
        db.prepare(`INSERT INTO construction_diary_photos
          (id, diary_id, project_id, object_key, original_name, content_type, byte_size, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(
            photo.id,
            diaryId,
            projectId,
            photo.objectKey,
            photo.filename,
            photo.contentType,
            photo.byteSize,
            photo.createdAt,
          ),
      ),
    );
  } catch {
    await Promise.allSettled(uploadedKeys.map((key) => bucket.delete(key)));
    return Response.json({ error: "Nao foi possivel armazenar as fotos agora." }, { status: 503 });
  }

  return Response.json(
    {
      photos: photos.map((photo) =>
        photoResponse({
          id: photo.id,
          diary_id: diaryId,
          project_id: projectId,
          object_key: photo.objectKey,
          original_name: photo.filename,
          content_type: photo.contentType,
          byte_size: photo.byteSize,
          created_at: photo.createdAt,
        }),
      ),
    },
    { status: 201 },
  );
}
