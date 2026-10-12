import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  client: text("client").notNull().default(""),
  address: text("address").notNull().default(""),
  startDate: text("start_date").notNull().default(""),
  dueDate: text("due_date").notNull().default(""),
  price: integer("price").notNull().default(0),
  paidValue: integer("paid_value").notNull().default(0),
  status: text("status").notNull().default("backlog"),
  priority: text("priority").notNull().default("normal"),
  type: text("type").notNull().default("Projeto arquitetônico"),
  areaM2: real("area_m2").notNull().default(0),
  color: text("color").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  completedAt: text("completed_at").notNull().default(""),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  parentId: text("parent_id"),
  title: text("title").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").notNull().default(0),
  trackedMinutes: integer("tracked_minutes").notNull().default(0),
  timerStartedAt: text("timer_started_at").notNull().default(""),
});

export const taskTimeEntries = sqliteTable("task_time_entries", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  taskId: text("task_id").notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at").notNull().default(""),
  durationSeconds: integer("duration_seconds").notNull().default(0),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  amount: integer("amount").notNull(),
  paidAt: text("paid_at").notNull(),
  method: text("method").notNull().default("Pix"),
});

export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const constructionSettings = sqliteTable("construction_settings", {
  projectId: text("project_id").primaryKey(),
  budget: integer("budget").notNull().default(0),
  contractValue: integer("contract_value").notNull().default(0),
  startDate: text("start_date").notNull().default(""),
  plannedEnd: text("planned_end").notNull().default(""),
});

export const constructionCosts = sqliteTable("construction_costs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  spentAt: text("spent_at").notNull(),
  supplier: text("supplier").notNull().default(""),
  payer: text("payer").notNull().default(""),
  paymentStatus: text("payment_status").notNull().default("Pago"),
});

export const constructionSchedule = sqliteTable("construction_schedule", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  plannedStart: text("planned_start").notNull(),
  plannedEnd: text("planned_end").notNull(),
  progress: integer("progress").notNull().default(0),
});

export const constructionDiary = sqliteTable("construction_diary", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  entryDate: text("entry_date").notNull(),
  summary: text("summary").notNull(),
  teamSize: integer("team_size").notNull().default(0),
  weather: text("weather").notNull().default(""),
  occurrences: text("occurrences").notNull().default(""),
  createdAt: text("created_at").notNull().default(""),
});

export const constructionDiaryPhotos = sqliteTable("construction_diary_photos", {
  id: text("id").primaryKey(),
  diaryId: text("diary_id").notNull(),
  projectId: text("project_id").notNull(),
  objectKey: text("object_key").notNull().unique(),
  originalName: text("original_name").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  createdAt: text("created_at").notNull(),
});

export const constructionCovers = sqliteTable("construction_covers", {
  projectId: text("project_id").primaryKey(),
  objectKey: text("object_key").notNull().unique(),
  contentType: text("content_type").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const boardColumns = sqliteTable("board_columns", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  color: text("color").notNull().default("#4f46e5"),
  sortOrder: integer("sort_order").notNull().default(0),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
});

export const teamMembers = sqliteTable("team_members", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("Colaborador"),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
});

export const cbmgoProjects = sqliteTable("cbmgo_projects", {
  id: text("id").primaryKey(),
  protocol: text("protocol").notNull().unique(),
  document: text("document").notNull().default(""),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  serviceType: text("service_type").notNull().default(""),
  area: real("area").notNull().default(0),
  status: text("status").notNull().default("ABERTO"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  lastCheckedAt: text("last_checked_at").notNull().default(""),
  lastChangedAt: text("last_changed_at").notNull().default(""),
  latestMovement: text("latest_movement").notNull().default(""),
});

export const cbmgoMovements = sqliteTable("cbmgo_movements", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  occurredAt: text("occurred_at").notNull(),
  description: text("description").notNull(),
  situation: text("situation").notNull().default(""),
  fingerprint: text("fingerprint").notNull().unique(),
  observedAt: text("observed_at").notNull(),
});
