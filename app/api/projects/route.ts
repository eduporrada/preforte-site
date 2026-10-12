import { ensureDatabase } from "../../../db/runtime";
import { getMediaBucket } from "../../../db/storage";
import { officeDateISO } from "../../date-utils";

export const runtime = "edge";

const projectSeeds = [
  ["p-residencia", "Residência Vale Verde", "Marina & Gustavo", "Setor Bueno, Goiânia", "2026-06-02", "2026-08-18", 2850000, 1710000, "progress", "high", "Projeto arquitetônico", 242, "#f2535c", "2026-06-02"],
  ["p-clinica", "Reforma Clínica Horizonte", "Dra. Camila Rocha", "Jardim Goiás, Goiânia", "2026-05-12", "2026-07-22", 4200000, 2940000, "progress", "high", "Gestão de obra", 310, "#aa7cff", "2026-05-12"],
  ["p-galpao", "Estrutural Galpão Orion", "Grupo Orion", "Aparecida de Goiânia", "2026-06-19", "2026-08-06", 1840000, 920000, "review", "medium", "Projeto estrutural", 780, "#6c91ff", "2026-06-19"],
  ["p-loteamento", "Levantamento Loteamento Sol", "Inova Urbanismo", "Senador Canedo", "2026-07-16", "2026-08-02", 980000, 490000, "progress", "medium", "Topografia", 0, "#49b8bc", "2026-07-16"],
  ["p-comercial", "Regularização Edifício Atlas", "Atlas Participações", "Centro, Goiânia", "2026-07-28", "2026-09-15", 1250000, 375000, "backlog", "normal", "Regularização", 0, "#f5b942", "2026-07-28"],
  ["p-pavimento", "Laudo Pavimento Industrial", "Log Center", "Anápolis", "2026-07-03", "2026-07-25", 760000, 760000, "done", "normal", "Laudo técnico", 0, "#48c78e", "2026-07-03"],
  ["p-bombeiros", "Projeto Preventivo Mercato", "Mercato Alimentos", "Trindade", "2026-04-08", "2026-06-28", 1380000, 1380000, "done", "medium", "Projeto de prevenção", 1160, "#e97849", "2026-04-08"],
  ["p-casa-serra", "Casa Serra Dourada", "Fernanda Alves", "Alphaville, Goiânia", "2026-07-24", "2026-10-05", 3250000, 975000, "backlog", "normal", "Projeto arquitetônico", 286, "#d366a8", "2026-07-24"],
] as const;

const taskSeeds = [
  ["t-r1", "p-residencia", "Levantamento e briefing", 1, 0],
  ["t-r2", "p-residencia", "Estudo preliminar", 1, 1],
  ["t-r3", "p-residencia", "Modelagem 3D", 1, 2],
  ["t-r4", "p-residencia", "Projeto executivo", 0, 3],
  ["t-c1", "p-clinica", "Demolições e preparação", 1, 0],
  ["t-c2", "p-clinica", "Instalações elétricas", 1, 1],
  ["t-c3", "p-clinica", "Revestimentos", 0, 2],
  ["t-c4", "p-clinica", "Vistoria de entrega", 0, 3],
  ["t-g1", "p-galpao", "Concepção estrutural", 1, 0],
  ["t-g2", "p-galpao", "Dimensionamento", 1, 1],
  ["t-g3", "p-galpao", "Revisão das pranchas", 0, 2],
  ["t-l1", "p-loteamento", "Implantação dos marcos", 1, 0],
  ["t-l2", "p-loteamento", "Levantamento em campo", 0, 1],
  ["t-l3", "p-loteamento", "Processamento da nuvem", 0, 2],
  ["t-a1", "p-comercial", "Coleta documental", 0, 0],
  ["t-a2", "p-comercial", "Consulta municipal", 0, 1],
  ["t-a3", "p-comercial", "Protocolo", 0, 2],
  ["t-p1", "p-pavimento", "Inspeção visual", 1, 0],
  ["t-p2", "p-pavimento", "Ensaios e diagnóstico", 1, 1],
  ["t-p3", "p-pavimento", "Emissão do laudo", 1, 2],
  ["t-b1", "p-bombeiros", "Levantamento preventivo", 1, 0],
  ["t-b2", "p-bombeiros", "Dimensionamento", 1, 1],
  ["t-b3", "p-bombeiros", "Aprovação CBM", 1, 2],
  ["t-s1", "p-casa-serra", "Briefing com cliente", 0, 0],
  ["t-s2", "p-casa-serra", "Estudo de implantação", 0, 1],
  ["t-s3", "p-casa-serra", "Anteprojeto", 0, 2],
] as const;

const paymentSeeds = [
  ["pay-1", "p-residencia", 855000, "2026-06-05", "Pix"],
  ["pay-2", "p-residencia", 855000, "2026-07-07", "Pix"],
  ["pay-3", "p-clinica", 1260000, "2026-05-15", "Transferência"],
  ["pay-4", "p-clinica", 840000, "2026-06-18", "Transferência"],
  ["pay-5", "p-clinica", 840000, "2026-07-18", "Transferência"],
  ["pay-6", "p-galpao", 920000, "2026-06-23", "Pix"],
  ["pay-7", "p-loteamento", 490000, "2026-07-17", "Pix"],
  ["pay-8", "p-comercial", 375000, "2026-07-29", "Boleto"],
  ["pay-9", "p-pavimento", 380000, "2026-07-04", "Pix"],
  ["pay-10", "p-pavimento", 380000, "2026-07-24", "Pix"],
  ["pay-11", "p-bombeiros", 690000, "2026-04-10", "Pix"],
  ["pay-12", "p-bombeiros", 690000, "2026-06-25", "Pix"],
  ["pay-13", "p-casa-serra", 975000, "2026-07-26", "Transferência"],
] as const;

const projectAccentPalette = ["#E64A0F", "#FF5B1A", "#FF8A5C", "#FFB020", "#E09112", "#2F7D4C", "#1E5638", "#78838A", "#2E404A", "#1F2A37"] as const;
const randomProjectAccent = () => projectAccentPalette[crypto.getRandomValues(new Uint32Array(1))[0] % projectAccentPalette.length];
const stableProjectAccent = (id: string) => projectAccentPalette[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % projectAccentPalette.length];

function parseNonNegativeInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function optionalId(value: unknown) {
  const id = String(value ?? "").trim();
  return id || null;
}

function elapsedSeconds(startedAt: string, endedAt = new Date().toISOString()) {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

function roundedTrackedMinutes(seconds: number) {
  return seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0;
}

async function seedDatabase() {
  const db = await ensureDatabase();
  const seeded = await db
    .prepare("SELECT value FROM app_meta WHERE key = 'project_seed_v1'")
    .first<{ value: string }>();
  if (!seeded) {
    const count = await db.prepare("SELECT COUNT(*) AS count FROM projects").first<{ count: number }>();
    if (Number(count?.count ?? 0) === 0) {
    await db.batch([
      ...projectSeeds.map((project) =>
        db.prepare(`INSERT INTO projects
          (id, name, client, address, start_date, due_date, price, paid_value, status, priority, type, area_m2, color, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(...project),
      ),
      ...taskSeeds.map((task) =>
        db.prepare("INSERT INTO tasks (id, project_id, title, done, sort_order) VALUES (?, ?, ?, ?, ?)").bind(...task),
      ),
      ...paymentSeeds.map((payment) =>
        db.prepare("INSERT INTO payments (id, project_id, amount, paid_at, method) VALUES (?, ?, ?, ?, ?)").bind(...payment),
      ),
    ]);
    }
    await db
      .prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('project_seed_v1', 'done')")
      .run();
  }
  return db;
}

export async function GET() {
  const db = await seedDatabase();
  const [projectResult, taskResult, paymentResult] = await db.batch([
    db.prepare("SELECT * FROM projects ORDER BY created_at DESC"),
    db.prepare("SELECT * FROM tasks ORDER BY project_id ASC, sort_order ASC"),
    db.prepare("SELECT * FROM payments ORDER BY paid_at DESC"),
  ]);
  const tasks = taskResult.results as Record<string, unknown>[];
  const payments = paymentResult.results as Record<string, unknown>[];
  const tasksByProject = new Map<string, Record<string, unknown>[]>();
  const paymentsByProject = new Map<string, Record<string, unknown>[]>();
  for (const task of tasks) {
    const projectId = String(task.project_id);
    const projectTasks = tasksByProject.get(projectId);
    if (projectTasks) projectTasks.push(task);
    else tasksByProject.set(projectId, [task]);
  }
  for (const payment of payments) {
    const projectId = String(payment.project_id);
    const projectPayments = paymentsByProject.get(projectId);
    if (projectPayments) projectPayments.push(payment);
    else paymentsByProject.set(projectId, [payment]);
  }
  const projectRows = projectResult.results as Record<string, unknown>[];
  const allowedAccents = new Set<string>(projectAccentPalette);
  const missingAccents = projectRows.filter((project) => !allowedAccents.has(String(project.color || "").toUpperCase()));
  if (missingAccents.length) {
    await db.batch(missingAccents.map((project) => {
      const color = stableProjectAccent(String(project.id));
      project.color = color;
      return db.prepare("UPDATE projects SET color = ? WHERE id = ?").bind(color, String(project.id));
    }));
  }
  const projects = projectRows.map((project) => ({
    id: project.id,
    name: project.name,
    client: project.client,
    address: project.address,
    startDate: project.start_date,
    dueDate: project.due_date,
    price: project.price,
    paidValue: project.paid_value,
    status: project.status,
    priority: project.priority,
    type: project.type,
    areaM2: project.area_m2,
    color: project.color,
    notes: project.notes || "",
    createdAt: project.created_at,
    completedAt:
      project.completed_at ||
      (project.status === "done" ? project.due_date : ""),
    tasks: (tasksByProject.get(String(project.id)) ?? [])
      .map((task) => ({
        id: task.id,
        parentId: task.parent_id || null,
        title: task.title,
        done: Boolean(task.done),
        estimatedMinutes: Number(task.estimated_minutes ?? 0),
        trackedMinutes: Number(task.tracked_minutes ?? 0),
        timerStartedAt: String(task.timer_started_at ?? ""),
      })),
    payments: (paymentsByProject.get(String(project.id)) ?? [])
      .map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        paidAt: payment.paid_at,
        method: payment.method,
      })),
  }));
  return Response.json(projects);
}

export async function POST(request: Request) {
  const db = await seedDatabase();
  const body = (await request.json()) as Record<string, unknown>;
  const id = crypto.randomUUID();
  const createdAt = officeDateISO();
  const price = Math.max(0, Number(body.price ?? 0));
  if (!String(body.name ?? "").trim() || price <= 0) {
    return Response.json({ error: "Nome e valor são obrigatórios." }, { status: 400 });
  }
  await db.prepare(`INSERT INTO projects
      (id, name, client, address, start_date, due_date, price, paid_value, status, priority, type, area_m2, color, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'backlog', 'low', ?, 0, ?, ?)`).bind(
      id,
      String(body.name).trim(),
      String(body.client ?? ""),
      String(body.address ?? ""),
      String(body.startDate ?? ""),
      String(body.dueDate ?? ""),
      price,
      String(body.type ?? "Projeto").trim(),
      randomProjectAccent(),
      createdAt,
    ).run();
  return Response.json({ id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const db = await seedDatabase();
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action ?? "");
  if (action === "move") {
    const status = String(body.status);
    const completedAt = status === "done" ? officeDateISO() : "";
    await db
      .prepare("UPDATE projects SET status = ?, completed_at = ? WHERE id = ?")
      .bind(status, completedAt, String(body.id))
      .run();
  } else if (action === "task") {
    const taskId = String(body.taskId);
    const projectId = String(body.projectId);
    const task = await db
      .prepare("SELECT timer_started_at FROM tasks WHERE id = ? AND project_id = ?")
      .bind(taskId, projectId)
      .first<{ timer_started_at: string }>();
    if (body.done && task?.timer_started_at) {
      const endedAt = new Date().toISOString();
      const seconds = elapsedSeconds(task.timer_started_at, endedAt);
      await db.batch([
        db.prepare(`UPDATE tasks
          SET done = 1, timer_started_at = '', tracked_minutes = tracked_minutes + ?
          WHERE id = ? AND project_id = ?`)
          .bind(roundedTrackedMinutes(seconds), taskId, projectId),
        db.prepare(`UPDATE task_time_entries
          SET ended_at = ?, duration_seconds = ?
          WHERE task_id = ? AND project_id = ? AND ended_at = ''`)
          .bind(endedAt, seconds, taskId, projectId),
      ]);
    } else {
      await db.prepare("UPDATE tasks SET done = ? WHERE id = ? AND project_id = ?").bind(
        body.done ? 1 : 0,
        taskId,
        projectId,
      ).run();
    }
  } else if (action === "add-task") {
    const projectId = String(body.projectId ?? "").trim();
    const title = String(body.title ?? "").trim();
    const parentId = optionalId(body.parentId);
    const estimatedMinutes = parseNonNegativeInteger(body.estimatedMinutes ?? 0);
    if (!projectId || !title) {
      return Response.json({ error: "Projeto e título são obrigatórios." }, { status: 400 });
    }
    if (estimatedMinutes === null) {
      return Response.json({ error: "Tempo estimado inválido." }, { status: 400 });
    }
    const project = await db
      .prepare("SELECT id FROM projects WHERE id = ?")
      .bind(projectId)
      .first<{ id: string }>();
    if (!project) {
      return Response.json({ error: "Projeto não encontrado." }, { status: 404 });
    }
    if (parentId) {
      const parent = await db
        .prepare("SELECT id FROM tasks WHERE id = ? AND project_id = ?")
        .bind(parentId, projectId)
        .first<{ id: string }>();
      if (!parent) {
        return Response.json({ error: "Tarefa principal não encontrada." }, { status: 400 });
      }
    }
    const sort = await db
      .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM tasks WHERE project_id = ?")
      .bind(projectId)
      .first<{ next_order: number }>();
    const taskId = crypto.randomUUID();
    await db
      .prepare(`INSERT INTO tasks
        (id, project_id, parent_id, title, done, sort_order, estimated_minutes, tracked_minutes)
        VALUES (?, ?, ?, ?, 0, ?, ?, 0)`)
      .bind(
        taskId,
        projectId,
        parentId,
        title,
        Number(sort?.next_order ?? 0),
        estimatedMinutes,
      )
      .run();
    return Response.json({ ok: true, id: taskId });
  } else if (action === "update-task-time") {
    const projectId = String(body.projectId ?? "").trim();
    const taskId = String(body.taskId ?? "").trim();
    if (!projectId || !taskId) {
      return Response.json({ error: "Projeto e tarefa são obrigatórios." }, { status: 400 });
    }
    const current = await db
      .prepare(`SELECT estimated_minutes, tracked_minutes
        FROM tasks WHERE id = ? AND project_id = ?`)
      .bind(taskId, projectId)
      .first<{ estimated_minutes: number; tracked_minutes: number }>();
    if (!current) {
      return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }
    const hasEstimated = Object.prototype.hasOwnProperty.call(body, "estimatedMinutes");
    const hasTracked = Object.prototype.hasOwnProperty.call(body, "trackedMinutes");
    if (!hasEstimated && !hasTracked) {
      return Response.json({ error: "Nenhum tempo informado." }, { status: 400 });
    }
    const estimatedMinutes = hasEstimated
      ? parseNonNegativeInteger(body.estimatedMinutes)
      : Number(current.estimated_minutes);
    const trackedMinutes = hasTracked
      ? parseNonNegativeInteger(body.trackedMinutes)
      : Number(current.tracked_minutes);
    if (estimatedMinutes === null || trackedMinutes === null) {
      return Response.json({ error: "Tempo informado inválido." }, { status: 400 });
    }
    await db
      .prepare(`UPDATE tasks
        SET estimated_minutes = ?, tracked_minutes = ?
        WHERE id = ? AND project_id = ?`)
      .bind(estimatedMinutes, trackedMinutes, taskId, projectId)
      .run();
    return Response.json({ ok: true, estimatedMinutes, trackedMinutes });
  } else if (action === "start-task-timer") {
    const projectId = String(body.projectId ?? "").trim();
    const taskId = String(body.taskId ?? "").trim();
    const task = await db
      .prepare("SELECT id, timer_started_at FROM tasks WHERE id = ? AND project_id = ?")
      .bind(taskId, projectId)
      .first<{ id: string; timer_started_at: string }>();
    if (!task) {
      return Response.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }
    if (task.timer_started_at) {
      return Response.json({ ok: true, startedAt: task.timer_started_at });
    }

    const now = new Date().toISOString();
    const running = await db
      .prepare("SELECT id, project_id, timer_started_at FROM tasks WHERE timer_started_at <> ''")
      .all<{ id: string; project_id: string; timer_started_at: string }>();
    const statements = running.results.flatMap((item) => {
      const seconds = elapsedSeconds(item.timer_started_at, now);
      return [
        db.prepare(`UPDATE tasks
          SET timer_started_at = '', tracked_minutes = tracked_minutes + ?
          WHERE id = ? AND project_id = ?`)
          .bind(roundedTrackedMinutes(seconds), item.id, item.project_id),
        db.prepare(`UPDATE task_time_entries
          SET ended_at = ?, duration_seconds = ?
          WHERE task_id = ? AND project_id = ? AND ended_at = ''`)
          .bind(now, seconds, item.id, item.project_id),
      ];
    });
    statements.push(
      db.prepare(`INSERT INTO task_time_entries
        (id, project_id, task_id, started_at, ended_at, duration_seconds)
        VALUES (?, ?, ?, ?, '', 0)`)
        .bind(crypto.randomUUID(), projectId, taskId, now),
      db.prepare("UPDATE tasks SET timer_started_at = '', done = 0 WHERE timer_started_at <> ''"),
      db.prepare("UPDATE tasks SET timer_started_at = ? WHERE id = ? AND project_id = ?")
        .bind(now, taskId, projectId),
    );
    await db.batch(statements);
    return Response.json({ ok: true, startedAt: now });
  } else if (action === "stop-task-timer" || action === "discard-idle-time") {
    const projectId = String(body.projectId ?? "").trim();
    const taskId = String(body.taskId ?? "").trim();
    const task = await db
      .prepare("SELECT timer_started_at FROM tasks WHERE id = ? AND project_id = ?")
      .bind(taskId, projectId)
      .first<{ timer_started_at: string }>();
    if (!task?.timer_started_at) {
      return Response.json({ error: "Nenhum temporizador ativo nessa tarefa." }, { status: 409 });
    }
    const now = new Date().toISOString();
    const requestedEnd =
      action === "discard-idle-time" ? String(body.idleStartedAt ?? "") : now;
    const endIsValid =
      requestedEnd &&
      Number.isFinite(new Date(requestedEnd).getTime()) &&
      new Date(requestedEnd).getTime() >= new Date(task.timer_started_at).getTime() &&
      new Date(requestedEnd).getTime() <= new Date(now).getTime();
    const endedAt = endIsValid ? requestedEnd : now;
    const seconds = elapsedSeconds(task.timer_started_at, endedAt);
    const minutes = roundedTrackedMinutes(seconds);
    const statements = [
      db.prepare(`UPDATE task_time_entries
        SET ended_at = ?, duration_seconds = ?
        WHERE task_id = ? AND project_id = ? AND ended_at = ''`)
        .bind(endedAt, seconds, taskId, projectId),
      db.prepare(`UPDATE tasks
        SET timer_started_at = '', tracked_minutes = tracked_minutes + ?
        WHERE id = ? AND project_id = ?`)
        .bind(minutes, taskId, projectId),
    ];
    if (action === "discard-idle-time") {
      statements.push(
        db.prepare(`INSERT INTO task_time_entries
          (id, project_id, task_id, started_at, ended_at, duration_seconds)
          VALUES (?, ?, ?, ?, '', 0)`)
          .bind(crypto.randomUUID(), projectId, taskId, now),
        db.prepare("UPDATE tasks SET timer_started_at = ? WHERE id = ? AND project_id = ?")
          .bind(now, taskId, projectId),
      );
    }
    await db.batch(statements);
    return Response.json({
      ok: true,
      trackedMinutesAdded: minutes,
      startedAt: action === "discard-idle-time" ? now : "",
    });
  } else if (action === "update-project-price") {
    const projectId = String(body.projectId ?? "").trim();
    const price = parseNonNegativeInteger(body.price);
    if (!projectId || price === null) {
      return Response.json({ error: "Projeto ou valor inválido." }, { status: 400 });
    }
    const project = await db
      .prepare("SELECT id FROM projects WHERE id = ?")
      .bind(projectId)
      .first<{ id: string }>();
    if (!project) {
      return Response.json({ error: "Projeto não encontrado." }, { status: 404 });
    }
    await db
      .prepare("UPDATE projects SET price = ? WHERE id = ?")
      .bind(price, projectId)
      .run();
    return Response.json({ ok: true, price });
  } else if (action === "update-details") {
    const price = Object.prototype.hasOwnProperty.call(body, "price")
      ? parseNonNegativeInteger(body.price)
      : null;
    if (Object.prototype.hasOwnProperty.call(body, "price") && price === null) {
      return Response.json({ error: "Valor do projeto inválido." }, { status: 400 });
    }
    await db
      .prepare(`UPDATE projects
        SET client = ?, address = ?, start_date = ?, due_date = ?, priority = ?, type = ?,
          area_m2 = ?, price = COALESCE(?, price)
        WHERE id = ?`)
      .bind(
        String(body.client ?? ""),
        String(body.address ?? ""),
        String(body.startDate ?? ""),
        String(body.dueDate ?? ""),
        String(body.priority ?? "normal"),
        String(body.type ?? "Projeto").trim(),
        Math.max(0, Number(body.areaM2 ?? 0)),
        price,
        String(body.projectId),
      )
      .run();
  } else if (action === "payment") {
    const amount = Math.max(0, Number(body.amount ?? 0));
    if (!amount) return Response.json({ error: "Valor inválido." }, { status: 400 });
    await db.batch([
      db.prepare("INSERT INTO payments (id, project_id, amount, paid_at, method) VALUES (?, ?, ?, ?, ?)").bind(
        crypto.randomUUID(),
        String(body.projectId),
        amount,
        String(body.paidAt),
        String(body.method ?? "Pix"),
      ),
      db.prepare("UPDATE projects SET paid_value = MIN(price, paid_value + ?) WHERE id = ?").bind(
        amount,
        String(body.projectId),
      ),
    ]);
  } else if (action === "update-notes") {
    await db.prepare("UPDATE projects SET notes = ? WHERE id = ?")
      .bind(String(body.notes ?? "").slice(0, 10000), String(body.projectId))
      .run();
  } else if (action === "delete-payment") {
    const projectId = String(body.projectId ?? "").trim();
    const paymentId = String(body.paymentId ?? "").trim();
    if (!projectId || !paymentId) {
      return Response.json({ error: "Pagamento inválido." }, { status: 400 });
    }
    const payment = await db
      .prepare("SELECT id FROM payments WHERE id = ? AND project_id = ?")
      .bind(paymentId, projectId)
      .first<{ id: string }>();
    if (!payment) {
      return Response.json({ error: "Pagamento não encontrado." }, { status: 404 });
    }
    await db.batch([
      db.prepare("DELETE FROM payments WHERE id = ? AND project_id = ?").bind(
        paymentId,
        projectId,
      ),
      db.prepare(`UPDATE projects
        SET paid_value = MIN(
          price,
          COALESCE((SELECT SUM(amount) FROM payments WHERE project_id = ?), 0)
        )
        WHERE id = ?`).bind(projectId, projectId),
    ]);
  } else if (action === "duplicate") {
    const sourceId = String(body.projectId ?? "");
    const source = await db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .bind(sourceId)
      .first<Record<string, unknown>>();
    if (!source) return Response.json({ error: "Projeto não encontrado." }, { status: 404 });
    const newId = crypto.randomUUID();
    const createdAt = officeDateISO();
    await db.prepare(`INSERT INTO projects
      (id, name, client, address, start_date, due_date, price, paid_value, status, priority, type, area_m2, color, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'backlog', ?, ?, ?, ?, ?, '')`).bind(
      newId,
      `${String(source.name)} — cópia`,
      String(source.client ?? ""),
      String(source.address ?? ""),
      String(source.start_date ?? ""),
      String(source.due_date ?? ""),
      Number(source.price ?? 0),
      String(source.priority ?? "normal"),
      String(source.type ?? "Projeto"),
      Number(source.area_m2 ?? 0),
      randomProjectAccent(),
      createdAt,
    ).run();
    const sourceTasks = await db
      .prepare(`SELECT id, parent_id, title, sort_order, estimated_minutes
        FROM tasks WHERE project_id = ? ORDER BY sort_order`)
      .bind(sourceId)
      .all<Record<string, unknown>>();
    if (sourceTasks.results.length) {
      const duplicatedTaskIds = new Map(
        sourceTasks.results.map((task) => [String(task.id), crypto.randomUUID()]),
      );
      await db.batch(
        sourceTasks.results.map((task) =>
          db.prepare(`INSERT INTO tasks
            (id, project_id, parent_id, title, done, sort_order, estimated_minutes, tracked_minutes)
            VALUES (?, ?, ?, ?, 0, ?, ?, 0)`)
            .bind(
              duplicatedTaskIds.get(String(task.id)),
              newId,
              task.parent_id
                ? duplicatedTaskIds.get(String(task.parent_id)) ?? null
                : null,
              String(task.title),
              Number(task.sort_order ?? 0),
              Number(task.estimated_minutes ?? 0),
            ),
        ),
      );
    }
  } else {
    return Response.json({ error: "Ação desconhecida." }, { status: 400 });
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const db = await seedDatabase();
  const id = new URL(request.url).searchParams.get("id");

  if (id) {
    const photoObjects = await db
      .prepare("SELECT object_key FROM construction_diary_photos WHERE project_id = ?")
      .bind(id)
      .all<{ object_key: string }>();
    if (photoObjects.results.length) {
      const bucket = getMediaBucket();
      await Promise.all(photoObjects.results.map((photo) => bucket.delete(photo.object_key)));
    }
  }
  if (!id) return Response.json({ error: "Projeto não informado." }, { status: 400 });
  await db.batch([
    db.prepare("DELETE FROM task_time_entries WHERE project_id = ?").bind(id),
    db.prepare("DELETE FROM tasks WHERE project_id = ?").bind(id),
    db.prepare("DELETE FROM payments WHERE project_id = ?").bind(id),
    db.prepare("DELETE FROM construction_costs WHERE project_id = ?").bind(id),
    db.prepare("DELETE FROM construction_schedule WHERE project_id = ?").bind(id),
    db.prepare("DELETE FROM construction_diary_photos WHERE project_id = ?").bind(id),
    db.prepare("DELETE FROM construction_diary WHERE project_id = ?").bind(id),
    db.prepare("DELETE FROM construction_settings WHERE project_id = ?").bind(id),
    db.prepare("DELETE FROM projects WHERE id = ?").bind(id),
  ]);
  return Response.json({ ok: true });
}
