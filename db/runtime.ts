import { env } from "./env";

async function initializeDatabase() {
  const db = env.DB;
  if (!db) throw new Error("D1 binding DB indisponível");

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL DEFAULT '',
      due_date TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL DEFAULT 0,
      paid_value INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'backlog',
      priority TEXT NOT NULL DEFAULT 'normal',
      type TEXT NOT NULL DEFAULT 'Projeto',
      area_m2 REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT ''
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      parent_id TEXT,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      estimated_minutes INTEGER NOT NULL DEFAULT 0,
      tracked_minutes INTEGER NOT NULL DEFAULT 0,
      timer_started_at TEXT NOT NULL DEFAULT ''
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS task_time_entries (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL DEFAULT '',
      duration_seconds INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      paid_at TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'Pix'
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS construction_settings (
      project_id TEXT PRIMARY KEY,
      budget INTEGER NOT NULL DEFAULT 0,
      contract_value INTEGER NOT NULL DEFAULT 0,
      start_date TEXT NOT NULL DEFAULT '',
      planned_end TEXT NOT NULL DEFAULT ''
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS construction_costs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount INTEGER NOT NULL,
      spent_at TEXT NOT NULL,
      supplier TEXT NOT NULL DEFAULT '',
      payer TEXT NOT NULL DEFAULT '',
      payment_status TEXT NOT NULL DEFAULT 'Pago'
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS construction_schedule (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      planned_start TEXT NOT NULL,
      planned_end TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS construction_diary (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      summary TEXT NOT NULL,
      team_size INTEGER NOT NULL DEFAULT 0,
      weather TEXT NOT NULL DEFAULT '',
      occurrences TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT ''
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS construction_diary_photos (
      id TEXT PRIMARY KEY,
      diary_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      object_key TEXT NOT NULL UNIQUE,
      original_name TEXT NOT NULL,
      content_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS construction_covers (
      project_id TEXT PRIMARY KEY,
      object_key TEXT NOT NULL UNIQUE,
      content_type TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS board_columns (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#4f46e5',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_system INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'Colaborador',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS cbmgo_projects (
      id TEXT PRIMARY KEY,
      protocol TEXT NOT NULL UNIQUE,
      document TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      service_type TEXT NOT NULL DEFAULT '',
      area REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ABERTO',
      active INTEGER NOT NULL DEFAULT 1,
      last_checked_at TEXT NOT NULL DEFAULT '',
      last_changed_at TEXT NOT NULL DEFAULT '',
      latest_movement TEXT NOT NULL DEFAULT ''
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS cbmgo_movements (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      description TEXT NOT NULL,
      situation TEXT NOT NULL DEFAULT '',
      fingerprint TEXT NOT NULL UNIQUE,
      observed_at TEXT NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS payments_project_idx ON payments(project_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS task_time_entries_task_idx ON task_time_entries(task_id, ended_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS task_time_entries_project_idx ON task_time_entries(project_id, started_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS construction_costs_project_idx ON construction_costs(project_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS construction_schedule_project_idx ON construction_schedule(project_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS construction_diary_project_idx ON construction_diary(project_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS construction_diary_photos_diary_idx ON construction_diary_photos(diary_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS construction_diary_photos_project_idx ON construction_diary_photos(project_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS construction_covers_updated_idx ON construction_covers(updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS board_columns_sort_idx ON board_columns(sort_order)"),
    db.prepare("CREATE INDEX IF NOT EXISTS cbmgo_projects_active_idx ON cbmgo_projects(active, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS cbmgo_movements_project_idx ON cbmgo_movements(project_id, occurred_at DESC)"),
  ]);

  const projectColumns = await db.prepare("PRAGMA table_info(projects)").all<{ name: string }>();
  if (!projectColumns.results.some((column) => column.name === "notes")) {
    try {
      await db.prepare("ALTER TABLE projects ADD COLUMN notes TEXT NOT NULL DEFAULT ''").run();
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column name")) throw error;
    }
  }

  const taskColumns = await db
    .prepare("PRAGMA table_info(tasks)")
    .all<{ name: string }>();
  const existingTaskColumns = new Set(taskColumns.results.map((column) => column.name));
  const missingTaskColumns = [
    ["parent_id", "ALTER TABLE tasks ADD COLUMN parent_id TEXT"],
    [
      "estimated_minutes",
      "ALTER TABLE tasks ADD COLUMN estimated_minutes INTEGER NOT NULL DEFAULT 0",
    ],
    [
      "tracked_minutes",
      "ALTER TABLE tasks ADD COLUMN tracked_minutes INTEGER NOT NULL DEFAULT 0",
    ],
    [
      "timer_started_at",
      "ALTER TABLE tasks ADD COLUMN timer_started_at TEXT NOT NULL DEFAULT ''",
    ],
  ] as const;

  for (const [column, statement] of missingTaskColumns) {
    if (existingTaskColumns.has(column)) continue;
    try {
      await db.prepare(statement).run();
    } catch (error) {
      // Concurrent cold starts may both observe a missing column. The second
      // ALTER is harmless once the first request has completed it.
      if (!String(error).toLowerCase().includes("duplicate column name")) {
        throw error;
      }
    }
  }

  const settingsColumns = await db
    .prepare("PRAGMA table_info(construction_settings)")
    .all<{ name: string }>();
  const existingSettingsColumns = new Set(settingsColumns.results.map((column) => column.name));
  if (!existingSettingsColumns.has("contract_value")) {
    try {
      await db
        .prepare("ALTER TABLE construction_settings ADD COLUMN contract_value INTEGER NOT NULL DEFAULT 0")
        .run();
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column name")) throw error;
    }
  }

  const costColumns = await db
    .prepare("PRAGMA table_info(construction_costs)")
    .all<{ name: string }>();
  const existingCostColumns = new Set(costColumns.results.map((column) => column.name));
  const missingCostColumns = [
    ["supplier", "ALTER TABLE construction_costs ADD COLUMN supplier TEXT NOT NULL DEFAULT ''"],
    ["payer", "ALTER TABLE construction_costs ADD COLUMN payer TEXT NOT NULL DEFAULT ''"],
    ["payment_status", "ALTER TABLE construction_costs ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'Pago'"],
  ] as const;
  for (const [column, statement] of missingCostColumns) {
    if (existingCostColumns.has(column)) continue;
    try {
      await db.prepare(statement).run();
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column name")) throw error;
    }
  }

  const diaryColumns = await db
    .prepare("PRAGMA table_info(construction_diary)")
    .all<{ name: string }>();
  const existingDiaryColumns = new Set(diaryColumns.results.map((column) => column.name));
  const missingDiaryColumns = [
    ["occurrences", "ALTER TABLE construction_diary ADD COLUMN occurrences TEXT NOT NULL DEFAULT ''"],
    ["created_at", "ALTER TABLE construction_diary ADD COLUMN created_at TEXT NOT NULL DEFAULT ''"],
  ] as const;
  for (const [column, statement] of missingDiaryColumns) {
    if (existingDiaryColumns.has(column)) continue;
    try {
      await db.prepare(statement).run();
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate column name")) throw error;
    }
  }

  return db;
}

let databasePromise: ReturnType<typeof initializeDatabase> | null = null;

export function ensureDatabase() {
  if (!databasePromise) {
    databasePromise = initializeDatabase().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}
