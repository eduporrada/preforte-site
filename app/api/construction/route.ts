import { ensureDatabase } from "../../../db/runtime";
import { getMediaBucket } from "../../../db/storage";
import { officeDateISO } from "../../date-utils";

export const runtime = "edge";

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

async function deleteDiaryPhotoObjects(
  db: Awaited<ReturnType<typeof ensureDatabase>>,
  projectId: string,
) {
  const rows = await db
    .prepare("SELECT object_key FROM construction_diary_photos WHERE project_id = ?")
    .bind(projectId)
    .all<{ object_key: string }>();
  if (!rows.results.length) return;
  const bucket = getMediaBucket();
  await Promise.all(rows.results.map((row) => bucket.delete(row.object_key)));
}

async function deleteConstructionCover(
  db: Awaited<ReturnType<typeof ensureDatabase>>,
  projectId: string,
) {
  const cover = await db.prepare("SELECT object_key FROM construction_covers WHERE project_id = ?").bind(projectId).first<{ object_key: string }>();
  if (cover?.object_key) await getMediaBucket().delete(cover.object_key);
}

async function seedConstruction() {
  const db = await ensureDatabase();
  const seeded = await db
    .prepare("SELECT value FROM app_meta WHERE key = 'construction_seed_v1'")
    .first<{ value: string }>();
  if (!seeded) {
    const project = await db
      .prepare("SELECT id FROM projects WHERE id = 'p-clinica'")
      .first<{ id: string }>();
    if (project) {
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO construction_settings (project_id, budget, start_date, planned_end) VALUES (?, ?, ?, ?)")
          .bind(project.id, 38000000, "2026-05-12", "2026-09-02"),
        db.prepare("INSERT OR IGNORE INTO construction_costs (id, project_id, category, description, amount, spent_at) VALUES (?, ?, ?, ?, ?, ?)")
          .bind("cost-seed-1", project.id, "Materiais", "Revestimentos e argamassas", 5820000, "2026-07-18"),
        db.prepare("INSERT OR IGNORE INTO construction_costs (id, project_id, category, description, amount, spent_at) VALUES (?, ?, ?, ?, ?, ?)")
          .bind("cost-seed-2", project.id, "Mão de obra", "Equipe de instalações", 4100000, "2026-07-22"),
        db.prepare("INSERT OR IGNORE INTO construction_costs (id, project_id, category, description, amount, spent_at) VALUES (?, ?, ?, ?, ?, ?)")
          .bind("cost-seed-3", project.id, "Serviços", "Locação de equipamentos", 1260000, "2026-07-24"),
        db.prepare("INSERT OR IGNORE INTO construction_diary (id, project_id, entry_date, summary, team_size, weather) VALUES (?, ?, ?, ?, ?, ?)")
          .bind("diary-seed-1", project.id, "2026-07-28", "Execução dos circuitos dos consultórios e preparação do contrapiso.", 12, "Ensolarado"),
      ]);
    }
    await db
      .prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('construction_seed_v1', 'done')")
      .run();
  }
  return db;
}

export async function GET(request: Request) {
  const db = await seedConstruction();
  const projectId = new URL(request.url).searchParams.get("projectId");
  const [settings, costs, diary, diaryPhotos] = await db.batch([
    projectId
      ? db.prepare("SELECT * FROM construction_settings WHERE project_id = ?").bind(projectId)
      : db.prepare("SELECT * FROM construction_settings"),
    projectId
      ? db.prepare("SELECT * FROM construction_costs WHERE project_id = ?").bind(projectId)
      : db.prepare("SELECT * FROM construction_costs"),
    projectId
      ? db.prepare("SELECT * FROM construction_diary WHERE project_id = ?").bind(projectId)
      : db.prepare("SELECT * FROM construction_diary"),
    projectId
      ? db.prepare("SELECT * FROM construction_diary_photos WHERE project_id = ? ORDER BY created_at, id").bind(projectId)
      : db.prepare("SELECT * FROM construction_diary_photos ORDER BY created_at, id"),
  ]);
  return Response.json({
    settings: settings.results,
    costs: costs.results,
    diary: diary.results,
    diaryPhotos: (diaryPhotos.results as DiaryPhotoRow[]).map(photoResponse),
  });
}

export async function POST(request: Request) {
  const db = await seedConstruction();
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action ?? "");
  if (action === "create-work") {
    const name = String(body.name ?? "").trim();
    const budget = Math.max(0, Number(body.budget ?? 0));
    const contractValue = Math.max(0, Number(body.contractValue ?? 0));
    if (!name || contractValue <= 0) {
      return Response.json({ error: "Nome e valor contratado são obrigatórios." }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const createdAt = officeDateISO();
    await db.batch([
      db.prepare(`INSERT INTO projects
        (id, name, client, address, start_date, due_date, price, paid_value, status, priority, type, area_m2, color, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'backlog', 'normal', 'Gestão de obra', 0, '', ?)`)
        .bind(
          id,
          name,
          String(body.client ?? ""),
          String(body.address ?? ""),
          String(body.startDate ?? ""),
          String(body.plannedEnd ?? ""),
          contractValue,
          createdAt,
        ),
      db.prepare(`INSERT INTO construction_settings
        (project_id, budget, contract_value, start_date, planned_end)
        VALUES (?, ?, ?, ?, ?)`)
        .bind(
          id,
          budget,
          contractValue,
          String(body.startDate ?? ""),
          String(body.plannedEnd ?? ""),
        ),
    ]);
    return Response.json({ id }, { status: 201 });
  }
  const projectId = String(body.projectId ?? "");
  if (!projectId) return Response.json({ error: "Obra não informada." }, { status: 400 });

  if (action === "settings") {
    const contractValue = Math.max(0, Number(body.contractValue ?? 0));
    const name = String(body.name ?? "").trim();
    const startDate = String(body.startDate ?? "");
    const plannedEnd = String(body.plannedEnd ?? "");
    await db.batch([
      db.prepare(`INSERT INTO construction_settings
        (project_id, budget, contract_value, start_date, planned_end)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(project_id) DO UPDATE SET
          budget = excluded.budget,
          contract_value = excluded.contract_value,
          start_date = excluded.start_date,
          planned_end = excluded.planned_end`)
        .bind(
          projectId,
          Math.max(0, Number(body.budget ?? 0)),
          contractValue,
          startDate,
          plannedEnd,
        ),
      db.prepare(`UPDATE projects
        SET name = CASE WHEN ? <> '' THEN ? ELSE name END,
          price = ?, start_date = ?, due_date = ?
        WHERE id = ?`)
        .bind(name, name, contractValue, startDate, plannedEnd, projectId),
    ]);
  } else if (action === "cost") {
    const description = String(body.description ?? "").trim();
    const amount = Math.max(0, Number(body.amount ?? 0));
    if (!description || amount <= 0) {
      return Response.json({ error: "Descrição e valor são obrigatórios." }, { status: 400 });
    }
    await db.prepare(`INSERT INTO construction_costs
      (id, project_id, category, description, amount, spent_at, supplier, payer, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        crypto.randomUUID(),
        projectId,
        String(body.category ?? "Outros"),
        description,
        amount,
        String(body.spentAt ?? officeDateISO()),
        String(body.supplier ?? "").trim(),
        String(body.payer ?? "").trim().slice(0, 120),
        String(body.paymentStatus ?? "Pago") === "Pendente" ? "Pendente" : "Pago",
      )
      .run();
  } else if (action === "update-cost") {
    const costId = String(body.costId ?? "").trim();
    const description = String(body.description ?? "").trim();
    const amount = Math.max(0, Number(body.amount ?? 0));
    if (!costId || !description || amount <= 0) {
      return Response.json({ error: "Item, descrição e valor são obrigatórios." }, { status: 400 });
    }
    const result = await db.prepare(`UPDATE construction_costs
      SET category = ?, description = ?, amount = ?, spent_at = ?, supplier = ?, payer = ?, payment_status = ?
      WHERE id = ? AND project_id = ?`)
      .bind(
        String(body.category ?? "Outros"),
        description,
        amount,
        String(body.spentAt ?? officeDateISO()),
        String(body.supplier ?? "").trim(),
        String(body.payer ?? "").trim().slice(0, 120),
        String(body.paymentStatus ?? "Pago") === "Pendente" ? "Pendente" : "Pago",
        costId,
        projectId,
      )
      .run();
    if (!result.meta.changes) {
      return Response.json({ error: "Custo não encontrado." }, { status: 404 });
    }
  } else if (action === "delete-cost") {
    const costId = String(body.costId ?? "").trim();
    if (!costId) return Response.json({ error: "Custo não informado." }, { status: 400 });
    const result = await db
      .prepare("DELETE FROM construction_costs WHERE id = ? AND project_id = ?")
      .bind(costId, projectId)
      .run();
    if (!result.meta.changes) {
      return Response.json({ error: "Custo não encontrado." }, { status: 404 });
    }
  } else if (action === "complete-work") {
    await db.batch([
      db.prepare(`INSERT INTO construction_settings
        (project_id, budget, contract_value, start_date, planned_end)
        SELECT id, 0, price, start_date, due_date FROM projects WHERE id = ?
        ON CONFLICT(project_id) DO NOTHING`)
        .bind(projectId),
      db.prepare("UPDATE projects SET status = 'done', completed_at = ? WHERE id = ?")
        .bind(officeDateISO(), projectId),
    ]);
  } else if (action === "reopen-work") {
    await db
      .prepare("UPDATE projects SET status = 'progress', completed_at = '' WHERE id = ?")
      .bind(projectId)
      .run();
  } else if (action === "delete-work") {
    await deleteDiaryPhotoObjects(db, projectId);
    await deleteConstructionCover(db, projectId);
    await db.batch([
      db.prepare("DELETE FROM task_time_entries WHERE project_id = ?").bind(projectId),
      db.prepare("DELETE FROM tasks WHERE project_id = ?").bind(projectId),
      db.prepare("DELETE FROM payments WHERE project_id = ?").bind(projectId),
      db.prepare("DELETE FROM construction_costs WHERE project_id = ?").bind(projectId),
      db.prepare("DELETE FROM construction_schedule WHERE project_id = ?").bind(projectId),
      db.prepare("DELETE FROM construction_diary_photos WHERE project_id = ?").bind(projectId),
      db.prepare("DELETE FROM construction_covers WHERE project_id = ?").bind(projectId),
      db.prepare("DELETE FROM construction_diary WHERE project_id = ?").bind(projectId),
      db.prepare("DELETE FROM construction_settings WHERE project_id = ?").bind(projectId),
      db.prepare("DELETE FROM projects WHERE id = ?").bind(projectId),
    ]);
  } else if (action === "diary") {
    const services = String(body.summary ?? "").trim();
    if (!services) {
      return Response.json({ error: "Informe os serviços executados." }, { status: 400 });
    }
    const diaryId = crypto.randomUUID();
    await db.prepare(`INSERT INTO construction_diary
      (id, project_id, entry_date, summary, team_size, weather, occurrences, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        diaryId,
        projectId,
        String(body.entryDate ?? officeDateISO()),
        services,
        Math.max(0, Number(body.teamSize ?? 0)),
        String(body.weather ?? ""),
        String(body.occurrences ?? "").trim(),
        new Date().toISOString(),
      )
      .run();
    return Response.json({ ok: true, diaryId }, { status: 201 });
  } else {
    return Response.json({ error: "Ação desconhecida." }, { status: 400 });
  }
  return Response.json({ ok: true }, { status: 201 });
}
