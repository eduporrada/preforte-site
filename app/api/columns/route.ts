import { ensureDatabase } from "../../../db/runtime";

export const runtime = "edge";

const defaultColumns = [
  ["backlog", "Não iniciado", "#1A1A1A", 0, 1],
  ["progress", "Em andamento", "#2F6BFF", 1, 1],
  ["stopped", "Parado", "#E5322D", 2, 1],
  ["review", "Em revisão", "#F2C94C", 3, 1],
  ["done", "Concluído", "#15803D", 4, 1],
] as const;

async function seedColumns() {
  const db = await ensureDatabase();
  const count = await db
    .prepare("SELECT COUNT(*) AS count FROM board_columns")
    .first<{ count: number }>();
  if (Number(count?.count ?? 0) === 0) {
    await db.batch(
      defaultColumns.map((column) =>
        db
          .prepare("INSERT INTO board_columns (id, label, color, sort_order, is_system) VALUES (?, ?, ?, ?, ?)")
          .bind(...column),
      ),
    );
  }
  const upgraded = await db
    .prepare("SELECT value FROM app_meta WHERE key = 'kanban_columns_v2'")
    .first<{ value: string }>();
  if (!upgraded) {
    await db.batch([
      db.prepare("UPDATE board_columns SET label = 'Não iniciado', color = '#656b74', sort_order = 0 WHERE id = 'backlog'"),
      db.prepare("UPDATE board_columns SET label = 'Em andamento', color = '#2684ff', sort_order = 1 WHERE id = 'progress'"),
      db.prepare("UPDATE board_columns SET sort_order = sort_order + 1 WHERE sort_order >= 2 AND id NOT IN ('review', 'done', 'stopped')"),
      db.prepare("INSERT OR IGNORE INTO board_columns (id, label, color, sort_order, is_system) VALUES ('stopped', 'Parado', '#ff8a3d', 2, 1)"),
      db.prepare("UPDATE board_columns SET label = 'Em revisão', color = '#7357ff', sort_order = 3 WHERE id = 'review'"),
      db.prepare("UPDATE board_columns SET label = 'Concluído', color = '#30c77b', sort_order = 4 WHERE id = 'done'"),
      db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('kanban_columns_v2', 'done')"),
    ]);
  }
  const colorUpgrade = await db
    .prepare("SELECT value FROM app_meta WHERE key = 'kanban_columns_v3_colors'")
    .first<{ value: string }>();
  if (!colorUpgrade) {
    await db.batch([
      db.prepare("UPDATE board_columns SET color = '#1A1A1A' WHERE id = 'backlog'"),
      db.prepare("UPDATE board_columns SET color = '#2F6BFF' WHERE id = 'progress'"),
      db.prepare("UPDATE board_columns SET color = '#E5322D' WHERE id = 'stopped'"),
      db.prepare("UPDATE board_columns SET color = '#F2C94C' WHERE id = 'review'"),
      db.prepare("UPDATE board_columns SET color = '#15803D' WHERE id = 'done'"),
      db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('kanban_columns_v3_colors', 'done')"),
    ]);
  }
  return db;
}

export async function GET() {
  const db = await seedColumns();
  const result = await db
    .prepare("SELECT id, label, color, sort_order, is_system FROM board_columns ORDER BY sort_order ASC")
    .all();
  return Response.json(
    result.results.map((column) => ({
      id: column.id,
      label: column.label,
      color: column.color,
      sortOrder: column.sort_order,
      isSystem: Boolean(column.is_system),
    })),
  );
}

export async function POST(request: Request) {
  const db = await seedColumns();
  const body = (await request.json()) as Record<string, unknown>;
  const label = String(body.label ?? "").trim();
  if (!label) return Response.json({ error: "Nome obrigatório." }, { status: 400 });
  const next = await db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM board_columns")
    .first<{ next_order: number }>();
  const id = `column-${crypto.randomUUID()}`;
  const colors = ["#1A1A1A", "#E5322D", "#2F6BFF", "#F2C94C"];
  await db
    .prepare("INSERT INTO board_columns (id, label, color, sort_order, is_system) VALUES (?, ?, ?, ?, 0)")
    .bind(id, label, colors[Number(next?.next_order ?? 0) % colors.length], Number(next?.next_order ?? 0))
    .run();
  return Response.json({ id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const db = await seedColumns();
  const body = (await request.json()) as Record<string, unknown>;
  const id = String(body.id ?? "").trim();
  const label = String(body.label ?? "").trim();
  const color = String(body.color ?? "").trim();
  if (!id) return Response.json({ error: "Etapa não informada." }, { status: 400 });
  if (!label && !color) return Response.json({ error: "Informe um nome ou uma cor." }, { status: 400 });
  if (color && !/^#[0-9a-f]{6}$/i.test(color)) {
    return Response.json({ error: "Cor inválida." }, { status: 400 });
  }
  const result = label && color
    ? await db.prepare("UPDATE board_columns SET label = ?, color = ? WHERE id = ?").bind(label, color, id).run()
    : label
      ? await db.prepare("UPDATE board_columns SET label = ? WHERE id = ?").bind(label, id).run()
      : await db.prepare("UPDATE board_columns SET color = ? WHERE id = ?").bind(color, id).run();
  if (!result.meta.changes) {
    return Response.json({ error: "Etapa não encontrada." }, { status: 404 });
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const db = await seedColumns();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Coluna não informada." }, { status: 400 });
  const column = await db
    .prepare("SELECT is_system FROM board_columns WHERE id = ?")
    .bind(id)
    .first<{ is_system: number }>();
  if (!column) return Response.json({ error: "Etapa não encontrada." }, { status: 404 });
  if (Boolean(column.is_system)) {
    return Response.json(
      { error: "As etapas principais não podem ser excluídas." },
      { status: 409 },
    );
  }
  const projects = await db
    .prepare("SELECT COUNT(*) AS count FROM projects WHERE status = ?")
    .bind(id)
    .first<{ count: number }>();
  if (Number(projects?.count ?? 0) > 0) {
    return Response.json(
      { error: "Mova os projetos desta coluna antes de excluí-la." },
      { status: 409 },
    );
  }
  const total = await db
    .prepare("SELECT COUNT(*) AS count FROM board_columns")
    .first<{ count: number }>();
  if (Number(total?.count ?? 0) <= 1) {
    return Response.json({ error: "O quadro precisa ter ao menos uma coluna." }, { status: 409 });
  }
  await db.prepare("DELETE FROM board_columns WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
