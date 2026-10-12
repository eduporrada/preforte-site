"use client";

/* Static brand assets bypass the unavailable production image transformer. */
/* eslint-disable @next/next/no-img-element */
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ArchiveRestore,
  BarChart3,
  BrickWall,
  Bell,
  Camera,
  ChartSpline,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  CloudSun,
  FileText,
  HandCoins,
  Hammer,
  Images,
  Layers3,
  Menu,
  MoreHorizontal,
  Package2,
  PanelsTopLeft,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Scale,
  Shapes,
  SlidersHorizontal,
  Timer,
  Trash2,
  UsersRound,
  Wrench,
  X,
  type LucideIcon,
  Bot,
} from "lucide-react";
import { OverviewDashboard } from "./components/OverviewDashboard";
import dynamic from "next/dynamic";
import { ProjectFiles } from "./components/ProjectFiles";
import { Escritorio } from "./components/Escritorio";
import { FolderPicker, ICONE_PASTA, ServiceTypePicker, corDoTipo } from "./components/kit";
import { categoriaDoTipo } from "./categorias";
const ReceivablesPage = dynamic(() => import("./components/ReceivablesPage").then((module) => module.ReceivablesPage), { loading: () => <div className="loading" role="status">Carregando contas a receber…</div> });
const TimeReportPage = dynamic(() => import("./components/TimeReportPage").then((module) => module.TimeReportPage), { loading: () => <div className="loading" role="status">Carregando relatório de tempo…</div> });
import { officeDateISO } from "./date-utils";

type Status = string;
type Priority = "urgent" | "high" | "medium" | "normal" | "low";
type Page =
  | "overview"
  | "agents"
  | "projects"
  | "construction"
  | "finance"
  | "receivables"
  | "time"
  | "archive"
  | "settings";
type BoardColumn = {
  id: string;
  label: string;
  color: string;
  notes: string;
  sortOrder: number;
  isSystem: boolean;
};
type WorkspaceUser = { displayName: string; email: string };
type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  done: boolean;
  parentId: string | null;
  estimatedMinutes: number;
  trackedMinutes: number;
  timerStartedAt: string;
};
type Payment = { id: string; amount: number; paidAt: string; method?: string };
const projectAccentPalette = ["#E64A0F", "#FF5B1A", "#FF8A5C", "#FFB020", "#E09112", "#2F7D4C", "#1E5638", "#78838A", "#2E404A", "#1F2A37"];
const projectAccent = (id: string) => projectAccentPalette[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % projectAccentPalette.length];
export type Project = {
  id: string;
  name: string;
  client: string;
  address: string;
  startDate: string;
  dueDate: string;
  price: number;
  paidValue: number;
  status: Status;
  priority: Priority;
  type: string;
  areaM2: number;
  color: string;
  createdAt: string;
  completedAt: string;
  tasks: Task[];
  payments: Payment[];
};

type ConstructionData = {
  settings: Array<{
    project_id: string;
    budget: number;
    contract_value: number;
    start_date: string;
    planned_end: string;
  }>;
  costs: Array<{
    id: string;
    project_id: string;
    category: string;
    description: string;
    amount: number;
    spent_at: string;
    supplier: string;
    payer: string;
    payment_status: string;
  }>;
  diary: Array<{
    id: string;
    project_id: string;
    entry_date: string;
    summary: string;
    team_size: number;
    weather: string;
    occurrences: string;
    created_at: string;
  }>;
  diaryPhotos?: Array<{
    id: string;
    diary_id: string;
    project_id: string;
    filename: string;
    content_type: string;
    byte_size: number;
    created_at: string;
    url: string;
  }>;
};

const emptyConstruction: ConstructionData = {
  settings: [],
  costs: [],
  diary: [],
  diaryPhotos: [],
};

const costCategories: Array<{
  name: string;
  hint: string;
  icon: LucideIcon;
  key: string;
}> = [
  { name: "Materiais", hint: "Insumos e acabamentos", icon: Package2, key: "materials" },
  { name: "Mão de obra", hint: "Equipe e profissionais", icon: UsersRound, key: "labor" },
  { name: "Equipamentos", hint: "Máquinas e ferramentas", icon: Wrench, key: "equipment" },
  { name: "Serviços", hint: "Terceiros e contratos", icon: Hammer, key: "services" },
  { name: "Taxas", hint: "Licenças e encargos", icon: ReceiptText, key: "fees" },
  { name: "Outros", hint: "Demais despesas", icon: Shapes, key: "other" },
];

const defaultColumns: BoardColumn[] = [
  { id: "backlog", label: "Não iniciado", color: "#1A1A1A", sortOrder: 0, isSystem: true },
  { id: "progress", label: "Em andamento", color: "#1A1A1A", sortOrder: 1, isSystem: true },
  { id: "stopped", label: "Parado", color: "#E5322D", sortOrder: 2, isSystem: true },
  { id: "done", label: "Concluído", color: "#1A1A1A", sortOrder: 4, isSystem: true },
];

const columnColorOptions = [
  { label: "Preto", value: "#1A1A1A" },
  { label: "Vermelho", value: "#E5322D" },
  { label: "Azul", value: "#2F6BFF" },
  { label: "Amarelo", value: "#F2C94C" },
  { label: "Verde", value: "#15803D" },
];

const pageMeta: Record<Page, { eyebrow: string; title: string }> = {
  overview: { eyebrow: "Painel principal", title: "Início" },
  agents: { eyebrow: "Equipe de agentes", title: "Escritório" },
  projects: { eyebrow: "Quadro principal", title: "Projetos do escritório" },
  finance: { eyebrow: "Visão financeira", title: "Faturamento" },
  receivables: { eyebrow: "Fluxo de caixa", title: "Contas a receber" },
  time: { eyebrow: "Produtividade", title: "Relatório de tempo" },
  construction: { eyebrow: "Controle de execução", title: "Gestão de obra" },
  archive: { eyebrow: "Histórico do escritório", title: "Arquivo" },
  settings: { eyebrow: "Espaço de trabalho", title: "Configurações" },
};

const nav: { id: Page; label: string; icon: LucideIcon; group?: string }[] = [
  { id: "overview", label: "Início", icon: PanelsTopLeft, group: "Workspace" },
  { id: "agents", label: "Escritório", icon: Bot },
  { id: "projects", label: "Projetos e Kanban", icon: Layers3 },
  { id: "construction", label: "Obras", icon: BrickWall },
  { id: "finance", label: "Financeiro", icon: ChartSpline, group: "Gestão" },
  { id: "receivables", label: "Contas a receber", icon: HandCoins },
  { id: "time", label: "Tempo", icon: Timer },
  { id: "archive", label: "Arquivo", icon: ArchiveRestore, group: "Organização" },
  { id: "settings", label: "Configurações", icon: SlidersHorizontal },
];

const fallbackProjects: Project[] = [];

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const compactMoneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

const headerDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const money = (cents: number, compact = false) =>
  (compact ? compactMoneyFormatter : moneyFormatter).format(cents / 100);

const shortDate = (date: string) =>
  date
    ? shortDateFormatter.format(new Date(`${date}T12:00:00`))
    : "Sem data";

const isOverdue = (project: Project) =>
  Boolean(
    project.dueDate &&
      project.status !== "done" &&
      new Date(`${project.dueDate}T23:59:59`).getTime() < Date.now(),
  );

function projectProgress(project: Project) {
  if (!project.tasks.length) return project.status === "done" ? 100 : 0;
  return Math.round(
    (project.tasks.filter((task) => task.done).length / project.tasks.length) *
      100,
  );
}

function isArchived(project: Project) {
  if (project.status !== "done") return false;
  const completedAt = project.completedAt || project.dueDate;
  if (!completedAt) return false;
  const completedMs = new Date(`${completedAt}T12:00:00`).getTime();
  return Date.now() - completedMs >= 30 * 86400000;
}

function projectElapsedDays(project: Project) {
  const startedAt = project.createdAt || project.startDate;
  if (!startedAt) return 0;
  const start = new Date(startedAt.includes("T") ? startedAt : `${startedAt}T12:00:00`).getTime();
  const endSource = project.completedAt;
  const end = endSource
    ? new Date(endSource.includes("T") ? endSource : `${endSource}T12:00:00`).getTime()
    : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  if (end < start) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

function projectElapsedMonths(project: Project, referenceTime = Date.now()) {
  const startedAt = project.createdAt || project.startDate;
  if (!startedAt) return 0;
  const start = new Date(startedAt.includes("T") ? startedAt : `${startedAt}T12:00:00`);
  const end = new Date(referenceTime);
  if (Number.isNaN(start.getTime()) || end.getTime() < start.getTime()) return 0;
  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
  const lastDayOfEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  const anniversaryDay = Math.min(start.getDate(), lastDayOfEndMonth);
  if (end.getDate() < anniversaryDay) months -= 1;
  return Math.max(0, months);
}

export function OfficeApp({ initialUser }: { initialUser?: WorkspaceUser }) {
  const [page, setPage] = useState<Page>("overview");
  const [projects, setProjects] = useState<Project[]>([]);
  const [columns, setColumns] = useState<BoardColumn[]>(defaultColumns);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [constructionPanelId, setConstructionPanelId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const [toast, setToast] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationNow, setNotificationNow] = useState(() => Date.now());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    projectId: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  async function loadProjects() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch("/api/projects", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Falha ao carregar");
      const loaded = (await response.json()) as Project[];
      setProjects(loaded.map((project) =>
        project.status === "review" ? { ...project, status: "progress" } : project,
      ));
    } catch {
      setProjects(fallbackProjects);
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  async function loadColumns() {
    try {
      const response = await fetch("/api/columns", { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao carregar");
      setColumns(((await response.json()) as BoardColumn[]).filter((column) => column.id !== "review"));
    } catch {
      setColumns(defaultColumns);
    }
  }

  useEffect(() => {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setPage("projects");
    }
  }, []);

  useEffect(() => {
    // Initial synchronization with the persistent workspace database.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProjects();
    void loadColumns();
  }, []);

  useEffect(() => {
    // Never leave the workspace hidden behind an indefinite loading state.
    const fallbackTimer = window.setTimeout(() => setLoading(false), 9000);
    return () => window.clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("blur", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("blur", closeMenu);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNotificationNow(Date.now()), 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  async function patchProject(
    body: Record<string, unknown>,
    options: { reload?: boolean } = {},
  ) {
    const response = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      notify("Não foi possível salvar essa alteração.");
      return false;
    }
    if (options.reload !== false) await loadProjects();
    return true;
  }

  async function moveProject(id: string, status: Status) {
    const previousProject = projects.find((project) => project.id === id);
    const completedAt = status === "done" ? officeDateISO() : "";
    setProjects((current) =>
      current.map((project) => (project.id === id ? { ...project, status, completedAt } : project)),
    );
    setDragging(null);
    setDragOver(null);
    const saved = await patchProject(
      { action: "move", id, status },
    );
    if (saved) {
      notify("Projeto movido.");
    } else if (previousProject) {
      setProjects((current) =>
        current.map((project) =>
          project.id === id
            ? { ...project, status: previousProject.status, completedAt: previousProject.completedAt }
            : project,
        ),
      );
    }
  }

  async function setTaskDone(projectId: string, taskId: string, done: boolean) {
    const previousDone = projects
      .find((project) => project.id === projectId)
      ?.tasks.find((task) => task.id === taskId)?.done;
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.map((task) =>
                task.id === taskId ? { ...task, done } : task,
              ),
            }
          : project,
      ),
    );
    const saved = await patchProject(
      { action: "task", projectId, taskId, done },
      { reload: false },
    );
    if (!saved && previousDone !== undefined) {
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId
            ? {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId ? { ...task, done: previousDone } : task,
                ),
              }
            : project,
        ),
      );
    }
  }

  async function createColumn(label: string) {
    const response = await fetch("/api/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (!response.ok) {
      notify("Não foi possível adicionar essa etapa.");
      return;
    }
    await loadColumns();
    notify("Nova etapa adicionada ao quadro.");
  }

  async function renameColumn(id: string, label: string) {
    const response = await fetch("/api/columns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label }),
    });
    if (!response.ok) {
      notify("Não foi possível renomear essa etapa.");
      return;
    }
    await loadColumns();
    notify("Etapa renomeada.");
  }

  async function updateColumnColor(id: string, color: string) {
    const response = await fetch("/api/columns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, color }),
    });
    if (!response.ok) {
      notify("Não foi possível alterar a cor dessa etapa.");
      return;
    }
    setColumns((current) => current.map((column) => column.id === id ? { ...column, color } : column));
    notify("Cor da etapa atualizada.");
  }

  async function deleteColumn(id: string) {
    const response = await fetch(`/api/columns?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      notify(result.error ?? "Não foi possível excluir essa etapa.");
      return;
    }
    await loadColumns();
    notify("Etapa excluída.");
  }

  async function deleteProject(project: Project) {
    const response = await fetch(`/api/projects?id=${encodeURIComponent(project.id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      notify("Não foi possível excluir o projeto.");
      return;
    }
    setSelectedId(null);
    setDeleteTarget(null);
    setContextMenu(null);
    await loadProjects();
    notify("Projeto excluído.");
  }

  async function duplicateProject(projectId: string) {
    const ok = await patchProject({ action: "duplicate", projectId });
    setContextMenu(null);
    if (ok) notify("Projeto duplicado e enviado para Não iniciado.");
  }

  const selected = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId],
  );
  const activeProjects = useMemo(
    () => projects.filter((project) => !isArchived(project)),
    [projects],
  );
  const archivedProjects = useMemo(
    () => projects.filter(isArchived),
    [projects],
  );
  const serviceTypes = useMemo(
    () =>
      Array.from(
        new Set(projects.map((project) => project.type.trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [projects],
  );
  const monthlyProjectNotifications = useMemo(
    () => projects
      .filter((project) => project.status !== "done")
      .flatMap((project) => {
        const months = projectElapsedMonths(project, notificationNow);
        return months >= 1 ? [{ project, months }] : [];
      })
      .sort((a, b) => b.months - a.months),
    [projects, notificationNow],
  );
  const firstName = initialUser?.displayName?.split(" ")[0] || "Eduardo";

  return (
    <div className="app" data-theme="neo">
      <Sidebar page={page} onNavigate={setPage} />
      <main className={`main page-${page}`}>
        <header className="topbar">
          <img className="mobile-logo" src="/preforte-logo-2026-128.png" alt="Preforte" width={38} height={38} />
          <div className="topbar-heading">
            <p className="eyebrow">{pageMeta[page].eyebrow}</p>
            <h1 className="page-title">{pageMeta[page].title}</h1>
            <span className="topbar-date">
              Olá, {firstName} · {headerDateFormatter.format(new Date())}
            </span>
          </div>
          <div className="top-actions">
            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                type="button"
                aria-label="Notificações de duração dos projetos"
                aria-expanded={notificationOpen}
                onClick={() => setNotificationOpen((current) => !current)}
              >
                <Bell size={18} />
                {monthlyProjectNotifications.length > 0 && <span>{monthlyProjectNotifications.length}</span>}
              </button>
              {notificationOpen && (
                <div className="notification-panel" role="status">
                  <header><strong>Tempo dos projetos</strong><small>Atualizado automaticamente</small></header>
                  {monthlyProjectNotifications.map(({ project, months }) => (
                    <button
                      type="button"
                      key={project.id}
                      onClick={() => {
                        setSelectedId(project.id);
                        setPage("projects");
                        setNotificationOpen(false);
                      }}
                    >
                      <span>{months}</span>
                      <div><strong>{project.name}</strong><small>Você está {months === 1 ? "há 1 mês" : `há ${months} meses`} trabalhando neste projeto.</small></div>
                    </button>
                  ))}
                  {!monthlyProjectNotifications.length && <p>Nenhum projeto completou um mês de trabalho.</p>}
                </div>
              )}
            </div>
            <button className="primary-button" type="button" onClick={() => setNewOpen(true)}>
              <Plus size={17} /> Novo projeto
            </button>
          </div>
        </header>

        {loading ? (
          <div className="loading">Carregando seu quadro…</div>
        ) : (
          <>
            {page === "overview" && <Escritorio compacto />}
            {page === "agents" && <Escritorio />}
            {page === "overview" && (
              <OverviewDashboard
                projects={projects}
                onOpenProject={setSelectedId}
                onNavigate={(destination) => setPage(destination as Page)}
                onNewProject={() => setNewOpen(true)}
              />
            )}
            {page === "projects" && (
              <ProjectsPage
                projects={activeProjects}
                columns={columns}
                dragging={dragging}
                dragOver={dragOver}
                onDragStart={setDragging}
                onDragEnd={() => setDragging(null)}
                onDragOver={setDragOver}
                onDrop={moveProject}
                onOpen={(projectId) => {
                  const project = projects.find((item) => item.id === projectId);
                  if (project && /obra|reforma|construção|execução/i.test(`${project.type} ${project.name}`)) {
                    setConstructionPanelId(projectId);
                  } else {
                    setSelectedId(projectId);
                  }
                }}
                onNew={() => setNewOpen(true)}
                onContext={(projectId, x, y) => {
                  setContextMenu({ projectId, x, y });
                }}
                onTask={setTaskDone}
                onCreateColumn={createColumn}
                onRenameColumn={renameColumn}
                onUpdateColumnColor={updateColumnColor}
                onDeleteColumn={deleteColumn}
              />
            )}
            {page === "finance" && <FinancePage projects={projects} />}
            {page === "receivables" && (
              <ReceivablesPage
                projects={projects}
                onOpenProject={setSelectedId}
                onRegisterPayment={async (projectId, amount) => {
                  const ok = await patchProject({
                    action: "payment",
                    projectId,
                    amount,
                    paidAt: officeDateISO(),
                  });
                  if (ok) notify("Recebimento registrado.");
                }}
              />
            )}
            {page === "time" && <TimeReportPage projects={projects} />}
            {page === "construction" && (
              <ConstructionPage
                projects={projects}
                onAction={notify}
                onProjectsChanged={loadProjects}
                onRegisterPayment={async (projectId, amount, paidAt, method) => {
                  const ok = await patchProject({ action: "payment", projectId, amount, paidAt, method });
                  if (ok) notify("Pagamento da obra registrado e sincronizado.");
                  return ok;
                }}
              />
            )}
            {page === "archive" && (
              <ArchivePage projects={archivedProjects} onOpen={setSelectedId} />
            )}
            {page === "settings" && (
              <SettingsPage initialUser={initialUser} onAction={notify} />
            )}
          </>
        )}
      </main>

      <BottomNav page={page} onNavigate={setPage} />

      {constructionPanelId && createPortal(
        <div className="construction-panel-backdrop" role="presentation" onMouseDown={() => setConstructionPanelId(null)}>
          <aside className="app construction-panel-drawer" data-theme="neo" role="dialog" aria-modal="true" aria-label="Gestão da obra" onMouseDown={(event) => event.stopPropagation()}>
            <button className="construction-panel-close" type="button" onClick={() => setConstructionPanelId(null)} aria-label="Fechar gestão da obra">×</button>
            <ConstructionPage key={constructionPanelId} projects={projects} onAction={notify} onProjectsChanged={loadProjects} initialProjectId={constructionPanelId} embedded onRegisterPayment={async (projectId, amount, paidAt, method) => patchProject({ action: "payment", projectId, amount, paidAt, method })} />
          </aside>
        </div>,
        document.body,
      )}

      {newOpen && (
        <NewProjectModal
          serviceTypes={serviceTypes}
          onClose={() => setNewOpen(false)}
          onCreated={async () => {
            setNewOpen(false);
            await loadProjects();
            notify("Projeto criado.");
            setPage("projects");
          }}
        />
      )}

      {selected && (
        <SimplifiedProjectDrawer
          project={selected}
          onClose={() => setSelectedId(null)}
          onDelete={() => setDeleteTarget(selected)}
          onUpdatePrice={async (price) => {
            const ok = await patchProject({
              action: "update-project-price",
              projectId: selected.id,
              price,
            });
            if (ok) notify("Valor do projeto atualizado.");
          }}
          onUpdatePriority={async (priority) => {
            const ok = await patchProject({
              action: "update-details",
              projectId: selected.id,
              client: selected.client,
              type: selected.type,
              address: selected.address,
              startDate: selected.startDate,
              dueDate: selected.dueDate,
              areaM2: selected.areaM2,
              priority,
            });
            if (ok) notify("Prioridade atualizada.");
          }}
          onAddTask={async (title) => {
            const ok = await patchProject({
              action: "add-task",
              projectId: selected.id,
              title,
              parentId: "",
              estimatedMinutes: 0,
            });
            if (ok) notify("Tarefa adicionada.");
          }}
          onTask={(taskId, done) => setTaskDone(selected.id, taskId, done)}
          onPayment={async (amount, paidAt) => {
            const ok = await patchProject({
              action: "payment",
              projectId: selected.id,
              amount,
              paidAt,
            });
            if (ok) notify("Pagamento registrado.");
          }}
          onDeletePayment={async (paymentId) => {
            const ok = await patchProject({
              action: "delete-payment",
              projectId: selected.id,
              paymentId,
            });
            if (ok) notify("Pagamento excluído e saldo recalculado.");
          }}
          onUpdateNotes={async (notes) => {
            const ok = await patchProject({ action: "update-notes", projectId: selected.id, notes });
            if (ok) notify("Observações salvas.");
          }}
          columns={columns}
          onMove={(status) => moveProject(selected.id, status)}
        />
      )}

      {contextMenu && (
        <CardContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onOpen={() => setSelectedId(contextMenu.projectId)}
          onDuplicate={() => void duplicateProject(contextMenu.projectId)}
          onDelete={() => {
            const project = projects.find((item) => item.id === contextMenu.projectId);
            if (project) setDeleteTarget(project);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmation
          project={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void deleteProject(deleteTarget)}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Sidebar({
  page,
  onNavigate,
}: {
  page: Page;
  onNavigate: (page: Page) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img
          className="brand-mark-compact"
          src="/preforte-logo-2026-128.png"
          alt="Preforte"
          width={46}
          height={46}
        />
      </div>
      <nav className="nav" aria-label="Navegação principal">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <div className="nav-entry" key={item.id}>
              {item.group && <span className="nav-group-label">{item.group}</span>}
              <button
                type="button"
                className={`nav-button ${page === item.id ? "active" : ""}`}
                onClick={() => onNavigate(item.id)}
                title={item.label}
              >
                <span className="nav-icon"><Icon size={18} strokeWidth={1.8} /></span>
                <span>{item.label}</span>
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function BottomNav({
  page,
  onNavigate,
}: {
  page: Page;
  onNavigate: (page: Page) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [indicatorIndex, setIndicatorIndex] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const pointerId = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const primaryPages: Page[] = ["projects", "construction", "finance", "receivables"];
  const morePages = nav.filter((item) => !primaryPages.includes(item.id));
  const visibleItems = [
    ...nav.filter((item) => primaryPages.includes(item.id)),
    { id: "more" as const, label: "Mais", icon: Menu },
  ];
  const currentIndex = Math.max(0, visibleItems.findIndex((item) => item.id === page || (item.id === "more" && morePages.some((entry) => entry.id === page))));

  useEffect(() => {
    if (!dragging) setIndicatorIndex(currentIndex);
  }, [currentIndex, dragging]);

  function positionAt(clientX: number) {
    const rect = navRef.current?.getBoundingClientRect();
    if (!rect) return currentIndex;
    return Math.max(0, Math.min(visibleItems.length - 1, ((clientX - rect.left) / rect.width) * visibleItems.length - 0.5));
  }

  function finishNavDrag(clientX: number) {
    const index = Math.round(positionAt(clientX));
    setIndicatorIndex(index);
    setDragging(false);
    pointerId.current = null;
    const item = visibleItems[index];
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    if (item.id === "more") setMoreOpen(true);
    else {
      onNavigate(item.id);
      setMoreOpen(false);
    }
  }

  return (
    <>
      {moreOpen && (
        <div className="mobile-more-menu" role="menu" aria-label="Outras páginas">
          {morePages.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={page === item.id ? "active" : ""}
                onClick={() => {
                  onNavigate(item.id);
                  setMoreOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <nav
        ref={navRef}
        className={`bottom-nav ${dragging ? "is-dragging" : ""}`}
        aria-label="Navegação mobile. Arraste para trocar de página."
        style={{ "--mobile-nav-index": indicatorIndex } as React.CSSProperties}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          pointerId.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          setIndicatorIndex(positionAt(event.clientX));
        }}
        onPointerMove={(event) => {
          if (pointerId.current !== event.pointerId) return;
          setIndicatorIndex(positionAt(event.clientX));
        }}
        onPointerUp={(event) => {
          if (pointerId.current !== event.pointerId) return;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          finishNavDrag(event.clientX);
        }}
        onPointerCancel={() => { pointerId.current = null; setDragging(false); setIndicatorIndex(currentIndex); }}
      >
        <span className="bottom-nav-glass" aria-hidden="true" />
        {nav.filter((item) => primaryPages.includes(item.id)).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={page === item.id ? "active" : ""}
              onClick={() => {
                if (suppressClick.current) return;
                onNavigate(item.id);
                setMoreOpen(false);
              }}
            >
              <Icon size={19} />
              {item.id === "projects" ? "Tarefas" : item.id === "receivables" ? "Receber" : item.label.split(" ")[0]}
            </button>
          );
        })}
        <button
          type="button"
          className={moreOpen || morePages.some((item) => item.id === page) ? "active" : ""}
          aria-expanded={moreOpen}
          onClick={() => { if (!suppressClick.current) setMoreOpen((value) => !value); }}
        >
          <Menu size={19} />
          Mais
        </button>
      </nav>
    </>
  );
}

function ProjectsPage({
  projects,
  columns,
  dragging,
  dragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onOpen,
  onNew,
  onContext,
  onTask,
  onCreateColumn,
  onRenameColumn,
  onUpdateColumnColor,
  onDeleteColumn,
}: {
  projects: Project[];
  columns: BoardColumn[];
  dragging: string | null;
  dragOver: Status | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (status: Status | null) => void;
  onDrop: (id: string, status: Status) => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onContext: (projectId: string, x: number, y: number) => void;
  onTask: (projectId: string, taskId: string, done: boolean) => void;
  onCreateColumn: (label: string) => void;
  onRenameColumn: (id: string, label: string) => void;
  onUpdateColumnColor: (id: string, color: string) => void;
  onDeleteColumn: (id: string) => void;
}) {
  const [newColumn, setNewColumn] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnMenu, setColumnMenu] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mobileColumnId, setMobileColumnId] = useState(columns[0]?.id ?? "");

  useEffect(() => {
    if (!columns.some((column) => column.id === mobileColumnId)) setMobileColumnId(columns[0]?.id ?? "");
  }, [columns, mobileColumnId]);

  return (
    <div className="board-surface">
      <div className="kanban-toolbar">
        <div className="kanban-status-copy">
          <span>Fluxo de trabalho</span>
          <strong>Projetos ordenados por prioridade</strong>
        </div>
        <div className="kanban-toolbar-controls">
          <span>{projects.length} projetos no quadro</span>
        </div>
      </div>
      <div className="mobile-stage-picker" aria-label="Escolher etapa do Kanban">
        {columns.map((column) => {
          const count = projects.filter((project) => project.status === column.id).length;
          return <button key={column.id} type="button" data-mobile-stage-id={column.id} className={`${mobileColumnId === column.id ? "active" : ""} ${dragOver === column.id ? "drag-over" : ""}`} style={{ "--stage-accent": column.color || "#007aff" } as React.CSSProperties} onClick={() => setMobileColumnId(column.id)}><span>{column.label}</span><small>{count}</small></button>;
        })}
      </div>
      <div className="kanban">
        {columns.map((column) => {
          const priorityRank: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, normal: 3, low: 4 };
          const cards = projects
            .filter((project) => project.status === column.id)
            .sort((a, b) => {
              return priorityRank[a.priority] - priorityRank[b.priority] ||
                (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
            });
          return (
            <section
              key={column.id}
              data-column-id={column.id}
              data-mobile-active={mobileColumnId === column.id ? "true" : "false"}
              className={`column ${dragOver === column.id ? "drag-over" : ""}`}
              style={{ "--column-accent": column.color || "#1A1A1A" } as React.CSSProperties}
              onDragOver={(event) => {
                event.preventDefault();
                onDragOver(column.id);
              }}
              onDragLeave={() => onDragOver(null)}
              onDrop={(event) => {
                event.preventDefault();
                if (dragging) onDrop(dragging, column.id);
              }}
            >
              <div className="column-head">
                <div className="column-title">
                  {renaming === column.id ? (
                    <form
                      className="rename-column-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (renameValue.trim()) onRenameColumn(column.id, renameValue.trim());
                        setRenaming(null);
                      }}
                    >
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onBlur={() => setRenaming(null)}
                        autoFocus
                      />
                    </form>
                  ) : (
                    column.label
                  )}
                  <span className="count">{cards.length}</span>
                </div>
                <div className="list-menu-wrap">
                  <button
                    className="list-menu-button"
                    type="button"
                    aria-label={`Opções de ${column.label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setColumnMenu((current) => current === column.id ? null : column.id);
                    }}
                  >
                    •••
                  </button>
                  {columnMenu === column.id && (
                    <div className="list-menu">
                      <div className="column-color-picker" aria-label={`Cor de ${column.label}`}>
                        <span>Cor da etapa</span>
                        <div>
                          {columnColorOptions.map((option) => (
                            <button
                              key={option.value}
                              className={column.color.toLowerCase() === option.value.toLowerCase() ? "active" : ""}
                              type="button"
                              aria-label={`Usar ${option.label}`}
                              title={option.label}
                              style={{ "--swatch": option.value } as React.CSSProperties}
                              onClick={() => {
                                onUpdateColumnColor(column.id, option.value);
                                setColumnMenu(null);
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRenameValue(column.label);
                          setRenaming(column.id);
                          setColumnMenu(null);
                        }}
                      >
                        Renomear etapa
                      </button>
                      {!column.isSystem && (
                        <button
                          className="danger-menu-item"
                          type="button"
                          onClick={() => {
                            setColumnMenu(null);
                            onDeleteColumn(column.id);
                          }}
                        >
                          Excluir etapa
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="column-cards">
                {cards.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    dragging={dragging === project.id}
                    onDragStart={() => onDragStart(project.id)}
                    onDragEnd={onDragEnd}
                    onDragHover={onDragOver}
                    onPointerDrop={(status) => { onDrop(project.id, status); setMobileColumnId(status); }}
                    onOpen={() => onOpen(project.id)}
                    onContext={(x, y) => onContext(project.id, x, y)}
                    onTask={(taskId, done) => onTask(project.id, taskId, done)}
                  />
                ))}
              </div>
              <button className="column-add" type="button" onClick={onNew}>＋ Adicionar projeto</button>
            </section>
          );
        })}
        <section className="add-column-shell">
          {addingColumn ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (newColumn.trim()) {
                  onCreateColumn(newColumn.trim());
                  setNewColumn("");
                  setAddingColumn(false);
                }
              }}
            >
              <input
                value={newColumn}
                onChange={(event) => setNewColumn(event.target.value)}
                placeholder="Nome da nova etapa"
                autoFocus
              />
              <div>
                <button className="primary-button" type="submit">Adicionar</button>
                <button className="close-button" type="button" onClick={() => setAddingColumn(false)}>×</button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setAddingColumn(true)}>＋ Adicionar outra etapa</button>
          )}
        </section>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  dragging,
  onDragStart,
  onDragEnd,
  onDragHover,
  onPointerDrop,
  onOpen,
  onContext,
  onTask,
}: {
  project: Project;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragHover: (status: Status | null) => void;
  onPointerDrop: (status: Status) => void;
  onOpen: () => void;
  onContext: (x: number, y: number) => void;
  onTask: (id: string, done: boolean) => void;
}) {
  const progress = projectProgress(project);
  const debt = Math.max(project.price - project.paidValue, 0);
  const late = isOverdue(project);
  const cardRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    width: number;
  } | null>(null);
  const pointerActive = useRef(false);
  const hoveredColumn = useRef<Status | null>(null);
  const latestPointer = useRef({ x: 0, y: 0 });
  const animationFrame = useRef<number | null>(null);
  const [pointerDragging, setPointerDragging] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(260);
  const [landing, setLanding] = useState(false);
  const prevStatus = useRef(project.status);
  useEffect(() => {
    if (prevStatus.current !== project.status) {
      prevStatus.current = project.status;
      setLanding(true);
      const t = window.setTimeout(() => setLanding(false), 450);
      return () => window.clearTimeout(t);
    }
  }, [project.status]);

  useEffect(() => {
    if (!pointerDragging || !overlayRef.current || !pointerStart.current) return;
    const start = pointerStart.current;
    overlayRef.current.style.transform = `translate3d(${latestPointer.current.x - start.offsetX}px, ${latestPointer.current.y - start.offsetY}px, 0)`;
  }, [pointerDragging]);

  useEffect(() => {
    return () => {
      if (animationFrame.current !== null) {
        window.cancelAnimationFrame(animationFrame.current);
      }
      document.body.classList.remove("is-kanban-dragging");
    };
  }, []);

  const lastPointer = useRef({ x: 0, t: 0 });
  const tilt = useRef(0);
  function updateOverlay(x: number, y: number) {
    latestPointer.current = { x, y };
    if (animationFrame.current !== null) return;
    animationFrame.current = window.requestAnimationFrame(() => {
      animationFrame.current = null;
      const start = pointerStart.current;
      if (!start || !overlayRef.current) return;
      const now = performance.now();
      const dt = Math.max(16, now - lastPointer.current.t);
      const vx = (latestPointer.current.x - lastPointer.current.x) / dt; // px/ms
      lastPointer.current = { x: latestPointer.current.x, t: now };
      const alvo = Math.max(-8, Math.min(8, vx * 6));
      tilt.current += (alvo - tilt.current) * 0.25;
      overlayRef.current.style.transform = `translate3d(${latestPointer.current.x - start.offsetX}px, ${latestPointer.current.y - start.offsetY}px, 0)`;
      overlayRef.current.style.setProperty("--tilt", `${tilt.current.toFixed(2)}deg`);
    });
  }

  function resetPointerDrag() {
    if (animationFrame.current !== null) {
      window.cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
    document.body.classList.remove("is-kanban-dragging");
    pointerActive.current = false;
    hoveredColumn.current = null;
    pointerStart.current = null;
    setPointerDragging(false);
    onDragHover(null);
    onDragEnd();
  }

  return (
    <article
      ref={cardRef}
      className={`card card-priority-${project.priority} ${dragging ? "is-drag-source" : ""} ${landing ? "is-landing" : ""}`}
      style={{ "--project-accent": project.color || projectAccent(project.id) } as React.CSSProperties}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button,input,label,a,select,textarea")) return;
        const rect = event.currentTarget.getBoundingClientRect();
        pointerStart.current = {
          x: event.clientX,
          y: event.clientY,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          width: rect.width,
        };
        latestPointer.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const start = pointerStart.current;
        if (!start) return;
        const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
        if (!pointerActive.current && distance > 7) {
          pointerActive.current = true;
          setPreviewWidth(start.width);
          setPointerDragging(true);
          document.body.classList.add("is-kanban-dragging");
          onDragStart();
        }
        if (!pointerActive.current) return;
        event.preventDefault();
        updateOverlay(event.clientX, event.clientY);
        const column = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest<HTMLElement>("[data-column-id],[data-mobile-stage-id]");
        const nextColumn = column?.dataset.columnId ?? column?.dataset.mobileStageId ?? null;
        if (nextColumn !== hoveredColumn.current) {
          hoveredColumn.current = nextColumn;
          onDragHover(nextColumn);
        }
      }}
      onPointerUp={(event) => {
        if (!pointerStart.current) return;
        const wasDragging = pointerActive.current;
        const target = hoveredColumn.current;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (wasDragging) {
          if (target) onPointerDrop(target);
          resetPointerDrag();
        } else {
          pointerStart.current = null;
          onOpen();
        }
      }}
      onPointerCancel={resetPointerDrag}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContext(event.clientX, event.clientY);
      }}
    >
      <button
        className="card-menu-button"
        type="button"
        aria-label={`Opções de ${project.name}`}
        onClick={(event) => {
          event.stopPropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          onContext(rect.right - 190, rect.bottom + 4);
        }}
      >
        •••
      </button>
      <div className="card-head">
        <span className="card-kind" style={{ "--tag-color": corDoTipo(project.type) } as React.CSSProperties}>{ICONE_PASTA[categoriaDoTipo(project.type).pasta]}</span>
        <div className="card-labels">
          {(project.priority === "urgent" || project.priority === "high") && (
            <span className={`priority-tag priority-${project.priority}`}>Alta</span>
          )}
          {project.priority === "medium" && <span className="priority-tag priority-medium">Média</span>}
          <span className="service-tag" style={{ "--tag-color": corDoTipo(project.type) } as React.CSSProperties}>{project.type}</span>
        </div>
      </div>
      <h3 className="card-title">{project.name}</h3>
      {project.client && <p className="card-client">{project.client}</p>}
      {project.tasks.length > 0 && (
        <ul className="task-list">
          {project.tasks.slice(0, 10).map((task) => (
            <li
              key={task.id}
              className={`task-item ${task.done ? "done" : ""}`}
              onClick={(event) => event.stopPropagation()}
            >
              <input
                className="task-check"
                type="checkbox"
                checked={task.done}
                onChange={(event) => onTask(task.id, event.target.checked)}
                aria-label={`${task.done ? "Reabrir" : "Concluir"} ${task.title}`}
              />
              <span>{task.title}</span>
            </li>
          ))}
        </ul>
      )}
      {project.tasks.length > 0 && (
        <div className="card-progress">
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <span>☑ {project.tasks.filter((task) => task.done).length}/{project.tasks.length}</span>
        </div>
      )}
      <div className="card-financial-grid">
        <span><small>Contratado</small><strong>{money(project.price, true)}</strong></span>
        <span><small>Recebido</small><strong>{money(project.paidValue, true)}</strong></span>
        <span className={debt > 0 ? "has-debt" : ""}><small>Pendente</small><strong>{money(debt, true)}</strong></span>
      </div>
      <div className="card-bottom">
        <div className="card-meta">
          {late ? <span className="late-pill">● Atrasado</span> : project.dueDate ? <span>◷ {shortDate(project.dueDate)}</span> : null}
        </div>
        {debt === 0 ? (
          <span className="payment-state paid">✓ Pago</span>
        ) : (
          <span className="payment-state pending">
            {project.paidValue > 0 ? "Pagamento parcial" : "Em aberto"}
          </span>
        )}
      </div>
      {pointerDragging && typeof document !== "undefined" && createPortal(
        <div
          ref={overlayRef}
          className="drag-follow-layer"
          style={{ width: previewWidth }}
          aria-hidden="true"
        >
          <div
            className={`card drag-follow-card card-priority-${project.priority}`}
            style={{ "--project-accent": project.color || projectAccent(project.id) } as React.CSSProperties}
          >
            <span className="card-menu-button drag-follow-menu" aria-hidden="true">•••</span>
            <div className="card-head">
              <span className="card-kind" style={{ "--tag-color": corDoTipo(project.type) } as React.CSSProperties}>{ICONE_PASTA[categoriaDoTipo(project.type).pasta]}</span>
              <div className="card-labels">
                {(project.priority === "urgent" || project.priority === "high") && <span className={`priority-tag priority-${project.priority}`}>Alta</span>}
                {project.priority === "medium" && <span className="priority-tag priority-medium">Média</span>}
                <span className="service-tag" style={{ "--tag-color": corDoTipo(project.type) } as React.CSSProperties}>{project.type}</span>
              </div>
            </div>
            <h3 className="card-title">{project.name}</h3>
            {project.client && <p className="card-client">{project.client}</p>}
            {project.tasks.length > 0 && (
              <ul className="task-list">
                {project.tasks.slice(0, 10).map((task) => (
                  <li key={task.id} className={`task-item ${task.done ? "done" : ""}`}>
                    <input
                      className="task-check"
                      type="checkbox"
                      checked={task.done}
                      readOnly
                      tabIndex={-1}
                    />
                    <span>{task.title}</span>
                  </li>
                ))}
              </ul>
            )}
            {project.tasks.length > 0 && (
              <div className="card-progress">
                <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                <span>☑ {project.tasks.filter((task) => task.done).length}/{project.tasks.length}</span>
              </div>
            )}
            <div className="card-financial-grid">
              <span><small>Contratado</small><strong>{money(project.price, true)}</strong></span>
              <span><small>Recebido</small><strong>{money(project.paidValue, true)}</strong></span>
              <span className={debt > 0 ? "has-debt" : ""}><small>Pendente</small><strong>{money(debt, true)}</strong></span>
            </div>
            <div className="card-bottom">
              <div className="card-meta">
                {late ? <span className="late-pill">● Atrasado</span> : project.dueDate ? <span>◷ {shortDate(project.dueDate)}</span> : null}
              </div>
              {debt === 0 ? (
                <span className="payment-state paid">✓ Pago</span>
              ) : (
                <span className="payment-state pending">
                  {project.paidValue > 0 ? "Pagamento parcial" : "Em aberto"}
                </span>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </article>
  );
}

function ArchivePage({
  projects,
  onOpen,
}: {
  projects: Project[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="content-wrap archive-page">
      <div className="archive-intro">
        <div>
          <span className="section-kicker">Arquivo automático</span>
          <h2>Projetos concluídos há mais de 30 dias.</h2>
          <p>O quadro principal permanece limpo sem apagar o histórico comercial e financeiro.</p>
        </div>
        <span className="archive-count">{projects.length} arquivados</span>
      </div>
      <div className="archive-grid">
        {projects
          .slice()
          .sort((a, b) => (b.completedAt || b.dueDate).localeCompare(a.completedAt || a.dueDate))
          .map((project) => (
            <button className="archive-card" type="button" key={project.id} onClick={() => onOpen(project.id)}>
              <div className="archive-card-top">
                <span>{project.type}</span>
                <span className={`priority-dot priority-${project.priority}`} />
              </div>
              <h3>{project.name}</h3>
              <p>{project.client || "Cliente não informado"}</p>
              <div className="archive-card-bottom">
                <span>Concluído em {shortDate(project.completedAt || project.dueDate)}</span>
                <strong>{money(project.price)}</strong>
              </div>
            </button>
          ))}
        {!projects.length && (
          <div className="empty-state archive-empty">
            <strong>Nenhum projeto arquivado</strong>
            <p>Projetos ficam aqui automaticamente 30 dias depois de entrarem em “Concluídos”.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CardContextMenu({
  x,
  y,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  x: number;
  y: number;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="context-menu"
      style={{ left: Math.min(x, window.innerWidth - 210), top: Math.min(y, window.innerHeight - 110) }}
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" onClick={onOpen}>Abrir projeto</button>
      <button type="button" onClick={onDuplicate}>Duplicar projeto</button>
      <button className="danger-menu-item" type="button" onClick={onDelete}>Excluir projeto</button>
    </div>
  );
}

function FinancePage({ projects }: { projects: Project[] }) {
  const [gadgetIndex, setGadgetIndex] = useState(0);
  const [service, setService] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [construction, setConstruction] = useState<ConstructionData>(emptyConstruction);
  useEffect(() => {
    void fetch("/api/construction", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : emptyConstruction)
      .then((payload: ConstructionData) => setConstruction(payload))
      .catch(() => setConstruction(emptyConstruction));
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setGadgetIndex((current) => (current + 1) % 4), 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  const types = Array.from(new Set(projects.map((project) => project.type)));
  const filtered = projects;
  const payments = projects
    .flatMap((project) =>
      project.payments.map((payment) => ({
        ...payment,
        projectName: project.name,
        client: project.client,
        service: project.type,
        contractValue: project.price,
      })),
    )
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  const received = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const contracted = filtered.reduce((sum, project) => sum + project.price, 0);
  const totalProjectReceived = filtered.reduce((sum, project) => sum + project.paidValue, 0);
  const open = Math.max(contracted - totalProjectReceived, 0);
  const avg = filtered.length ? Math.round(contracted / filtered.length) : 0;
  const paymentRate = contracted ? Math.round((totalProjectReceived / contracted) * 100) : 0;
  const overdueBalance = filtered
    .filter(isOverdue)
    .reduce((sum, project) => sum + Math.max(0, project.price - project.paidValue), 0);
  const completedWorkResults = filtered
    .filter((project) => project.status === "done" && construction.settings.some((item) => item.project_id === project.id))
    .map((project) => {
      const settings = construction.settings.find((item) => item.project_id === project.id);
      const cost = construction.costs
        .filter((item) => item.project_id === project.id)
        .reduce((sum, item) => sum + item.amount, 0);
      const revenue = settings?.contract_value || project.price;
      return { project, revenue, cost, profit: revenue - cost };
    });
  const constructionProfit = completedWorkResults.reduce((sum, item) => sum + item.profit, 0);
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYearKey = String(now.getFullYear());
  const monthRevenue = payments.filter((payment) => payment.paidAt.startsWith(currentMonthKey)).reduce((sum, payment) => sum + payment.amount, 0);
  const yearRevenue = payments.filter((payment) => payment.paidAt.startsWith(currentYearKey)).reduce((sum, payment) => sum + payment.amount, 0);
  const gadgetMetrics = [
    { title: "Ticket médio", value: money(avg), note: "Valor médio por projeto", icon: "R$" },
    { title: "Taxa de recebimento", value: `${paymentRate}%`, note: `${money(totalProjectReceived)} já recebidos`, icon: "%" },
    { title: "Lucro de obras", value: money(constructionProfit), note: `${completedWorkResults.length} obra(s) concluída(s)`, icon: "↗" },
    { title: "Saldo atrasado", value: money(overdueBalance), note: `${filtered.filter(isOverdue).length} projeto(s) fora do prazo`, icon: "!" },
  ];
  const paymentGroups = Array.from(payments.reduce((groups, payment) => {
    const key = payment.paidAt.slice(0, 7) || "sem-data";
    const current = groups.get(key) ?? [];
    current.push(payment);
    groups.set(key, current);
    return groups;
  }, new Map<string, typeof payments>()).entries());
  const monthLabels = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const monthValues = monthLabels.map((_, index) =>
    payments
      .filter((payment) => new Date(`${payment.paidAt}T12:00:00`).getMonth() === index)
      .reduce((sum, payment) => sum + payment.amount, 0),
  );
  const ranking = types
    .map((type) => ({
      type,
      value: payments
        .filter((payment) => payment.service === type)
        .reduce((sum, payment) => sum + payment.amount, 0),
      contracts: filtered.filter((project) => project.type === type).length,
    }))
    .filter((item) => item.contracts > 0)
    .sort((a, b) => b.value - a.value);
  const maxMonth = Math.max(...monthValues, 1);
  const maxRank = Math.max(...ranking.map((item) => item.value), 1);
  const colors = ["#1A1A1A", "#1A1A1A", "#E5322D", "#1A1A1A"];

  function resetFilters() {
    setService("all");
    setPaymentStatus("all");
    setFromDate("");
    setToDate("");
  }

  return (
    <div className="content-wrap finance-report">
      <div className="print-report-header">
        <div className="print-report-brand">
          <img src="/preforte-logo-2026-128.png" alt="Preforte" width={54} height={54} />
          <span><strong>PREFORTE</strong><small>ENGENHARIA E CONSTRUTORA</small></span>
        </div>
        <div><strong>Relatório financeiro</strong><span>Emitido em {new Date().toLocaleDateString("pt-BR")}</span></div>
      </div>
      <div className="finance-report-actions">
        <div><span className="section-kicker">Visão financeira</span><p>Dados consolidados de todos os projetos e obras.</p></div>
        <button className="primary-button" type="button" onClick={() => window.print()}>Imprimir / salvar PDF</button>
      </div>
      <div className="metric-grid finance-primary-metrics">
        <Metric title="Faturamento do mês" value={money(monthRevenue)} note={currentMonthKey.split("-").reverse().join("/")} icon="↗" />
        <Metric title="Faturamento do ano" value={money(yearRevenue)} note={currentYearKey} icon="◇" />
        <Metric title="Saldo a receber" value={money(open)} note="Total ainda pendente" icon="○" />
      </div>
      <div className="finance-gadget-grid" aria-live="polite">
        {[gadgetMetrics[gadgetIndex], gadgetMetrics[(gadgetIndex + 1) % gadgetMetrics.length]].map((metric, index) => (
          <div className="finance-gadget" key={`${gadgetIndex}-${index}`}>
            <Metric {...metric} />
            <span className="gadget-caption">Insight atualizado automaticamente</span>
          </div>
        ))}
      </div>
      <div className="filters finance-toolbar legacy-finance-filters" aria-hidden="true">
        <div className="filter-group">
          <select className="select" value={service} onChange={(e) => setService(e.target.value)}>
            <option value="all">Todos os serviços</option>
            {types.map((type) => <option key={type}>{type}</option>)}
          </select>
          <select className="select" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
            <option value="all">Todos os pagamentos</option>
            <option value="paid">Quitados</option>
            <option value="open">Com saldo aberto</option>
          </select>
          <label className="date-filter">De <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
          <label className="date-filter">Até <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
        </div>
        <div className="report-actions">
          <button className="ghost-button" type="button" onClick={resetFilters}>Limpar filtros</button>
          <button className="primary-button" type="button" onClick={() => window.print()}>⤓ Imprimir / salvar PDF</button>
        </div>
      </div>
      <div className="report-filter-summary">
        <span>{filtered.length} projetos analisados</span>
        <span>{payments.length} pagamentos no período</span>
        <span>{service === "all" ? "Todos os serviços" : service}</span>
      </div>
      <div className="metric-grid finance-metrics">
        <Metric title="Recebido no período" value={money(received)} note={`${payments.length} pagamentos filtrados`} icon="↗" />
        <Metric title="Total contratado" value={money(contracted)} note={`${filtered.length} contratos`} icon="◇" />
        <Metric title="Saldo a receber" value={money(open)} note="Saldo de todos os contratos filtrados" icon="○" />
        <Metric title="Ticket médio" value={money(avg)} note="Valor médio por projeto" icon="≋" />
        <Metric title="Taxa de recebimento" value={`${paymentRate}%`} note={`${money(totalProjectReceived)} já recebidos`} icon="%" />
        <Metric title="Saldo de atrasados" value={money(overdueBalance)} note={`${filtered.filter(isOverdue).length} projetos fora do prazo`} icon="!" />
        <Metric title="Lucro de obras concluídas" value={money(constructionProfit)} note={`${completedWorkResults.length} obra(s) finalizada(s)`} icon="R$" />
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head"><div><h2>Entradas por mês</h2><p className="panel-sub">Pagamentos efetivamente recebidos no período escolhido</p></div></div>
          <div className="chart">
            {monthValues.map((value, index) => (
              <div className="chart-item" key={monthLabels[index]}>
                <div className="chart-bar-wrap">
                  <div className="chart-bar" style={{ height: `${Math.max((value / maxMonth) * 100, 2)}%` }}>
                    {value > 0 && <span className="chart-value">{money(value, true)}</span>}
                  </div>
                </div>
                <span className="chart-label">{monthLabels[index]}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><div><h2>Receita por serviço</h2><p className="panel-sub">Ranking do que mais gerou caixa</p></div></div>
          <div className="ranking">
            {ranking.slice(0, 8).map((item, index) => (
              <div className="ranking-row" key={item.type}>
                <span className="ranking-label">{item.type}</span>
                <div className="ranking-track"><div className="ranking-fill" style={{ width: `${(item.value / maxRank) * 100}%`, "--bar": colors[index % colors.length] } as React.CSSProperties} /></div>
                <span className="ranking-value">{money(item.value, true)}</span>
              </div>
            ))}
            {!ranking.length && <p className="empty-copy">Sem pagamentos para os filtros escolhidos.</p>}
          </div>
        </section>
      </div>
      <section className="panel report-section">
        <div className="panel-head"><div><h2>Resultado por projeto</h2><p className="panel-sub">Contratos, recebimentos, saldos e preço por metro quadrado</p></div></div>
        <div className="table-scroll mobile-card-table">
          <table className="data-table detailed-table">
            <thead><tr><th>Projeto</th><th>Cliente</th><th>Serviço</th><th>Contratado</th><th>Recebido</th><th>Em aberto</th><th>Recebido</th><th>Preço / m²</th></tr></thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project.id}>
                  <td data-label="Projeto"><strong>{project.name}</strong>{isOverdue(project) && <span className="table-alert">Atrasado</span>}</td>
                  <td data-label="Cliente">{project.client || "—"}</td>
                  <td data-label="Serviço">{project.type}</td>
                  <td data-label="Contratado">{money(project.price)}</td>
                  <td data-label="Recebido">{money(project.paidValue)}</td>
                  <td data-label="Em aberto"><strong>{money(Math.max(0, project.price - project.paidValue))}</strong></td>
                  <td data-label="Percentual">{project.price ? `${Math.round((project.paidValue / project.price) * 100)}%` : "—"}</td>
                  <td data-label="Preço / m²">{project.areaM2 ? money(project.price / project.areaM2) : "—"}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={8}>Nenhum projeto encontrado com estes filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel report-section construction-profit-report">
        <div className="panel-head">
          <div>
            <h2>Resultado das obras concluídas</h2>
            <p className="panel-sub">Valor contratado menos todos os custos lançados na Gestão de Obra</p>
          </div>
          <strong className={constructionProfit >= 0 ? "profit-positive" : "profit-negative"}>
            {money(constructionProfit)}
          </strong>
        </div>
        <div className="table-scroll mobile-card-table">
          <table className="data-table">
            <thead><tr><th>Obra</th><th>Concluída em</th><th>Contratado</th><th>Custo total</th><th>Lucro</th><th>Margem</th></tr></thead>
            <tbody>
              {completedWorkResults.map(({ project, revenue, cost, profit }) => (
                <tr key={project.id}>
                  <td data-label="Obra"><strong>{project.name}</strong></td>
                  <td data-label="Concluída em">{project.completedAt ? shortDate(project.completedAt) : "—"}</td>
                  <td data-label="Contratado">{money(revenue)}</td>
                  <td data-label="Custo total">{money(cost)}</td>
                  <td data-label="Lucro" className={profit >= 0 ? "profit-positive" : "profit-negative"}><strong>{money(profit)}</strong></td>
                  <td data-label="Margem">{revenue ? `${Math.round((profit / revenue) * 100)}%` : "—"}</td>
                </tr>
              ))}
              {!completedWorkResults.length && <tr><td colSpan={6}>Conclua uma obra para visualizar o lucro aqui.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <div className="dashboard-grid report-bottom-grid">
        <section className="panel report-section">
          <div className="panel-head"><div><h2>Histórico de pagamentos</h2><p className="panel-sub">Lançamentos considerados no período</p></div></div>
          <div className="table-scroll mobile-card-table">
            <table className="data-table">
              <thead><tr><th>Data</th><th>Projeto</th><th>Cliente</th><th>Método</th><th>Valor</th></tr></thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td data-label="Data">{new Date(`${payment.paidAt}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                    <td data-label="Projeto"><strong>{payment.projectName}</strong></td>
                    <td data-label="Cliente">{payment.client || "—"}</td>
                    <td data-label="Método">{payment.method || "Não informado"}</td>
                    <td data-label="Valor"><strong>{money(payment.amount)}</strong></td>
                  </tr>
                ))}
                {!payments.length && <tr><td colSpan={5}>Nenhum pagamento no período.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel report-section">
          <div className="panel-head"><div><h2>Contas a receber</h2><p className="panel-sub">Projetos com saldo em aberto</p></div></div>
          <div className="receivable-list">
            {filtered.filter((project) => project.paidValue < project.price).map((project) => (
              <div className="receivable-row" key={project.id}>
                <div><strong>{project.name}</strong><span>{project.client || project.type}</span></div>
                <div><strong>{money(project.price - project.paidValue)}</strong><span>{project.dueDate ? `Prazo ${shortDate(project.dueDate)}` : "Sem prazo"}</span></div>
              </div>
            ))}
            {!filtered.some((project) => project.paidValue < project.price) && <p className="empty-copy">Nenhum saldo em aberto.</p>}
          </div>
        </section>
      </div>
      <section className="panel payment-ledger">
        <div className="panel-head"><div><span className="section-kicker">Lista de pagamentos</span><h2>Recebimentos por mês</h2><p className="panel-sub">Projetos, clientes, datas e valores efetivamente recebidos.</p></div></div>
        {paymentGroups.map(([month, entries]) => (
          <div className="payment-month-group" key={month}>
            <div className="payment-month-heading">
              <h3>{month === "sem-data" ? "Sem data" : new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h3>
              <strong>{money(entries.reduce((sum, payment) => sum + payment.amount, 0))}</strong>
            </div>
            <div className="table-scroll mobile-card-table">
              <table className="data-table payment-ledger-table">
                <thead><tr><th>Projeto ou obra</th><th>Cliente</th><th>Valor contratado</th><th>Data</th><th>Método</th><th>Valor recebido</th></tr></thead>
                <tbody>{entries.map((payment) => (
                  <tr key={payment.id}>
                    <td data-label="Projeto ou obra"><strong>{payment.projectName}</strong></td>
                    <td data-label="Cliente">{payment.client || "Cliente não informado"}</td>
                    <td data-label="Valor contratado">{money(payment.contractValue)}</td>
                    <td data-label="Data">{new Date(`${payment.paidAt}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                    <td data-label="Método">{payment.method || "Não informado"}</td>
                    <td data-label="Valor recebido"><strong>{money(payment.amount)}</strong></td>
                  </tr>
                ))}</tbody>
                <tfoot><tr><td colSpan={5}>Total do mês</td><td><strong>{money(entries.reduce((sum, payment) => sum + payment.amount, 0))}</strong></td></tr></tfoot>
              </table>
            </div>
          </div>
        ))}
        {!paymentGroups.length && <p className="empty-copy">Nenhum pagamento registrado.</p>}
        <footer className="payment-ledger-total"><span>Total geral recebido</span><strong>{money(received)}</strong></footer>
      </section>
    </div>
  );
}

function Metric({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: string;
  note: string;
  icon: string;
}) {
  return (
    <div className="metric">
      <div className="metric-head"><span>{title}</span><span className="metric-icon">{icon}</span></div>
      <div className="metric-value">{value}</div>
      <div className="metric-note">{note}</div>
    </div>
  );
}

function ConstructionPage({
  projects,
  onAction,
  onProjectsChanged,
  initialProjectId = null,
  embedded = false,
  onRegisterPayment,
}: {
  projects: Project[];
  onAction: (message: string) => void;
  onProjectsChanged: () => Promise<void>;
  initialProjectId?: string | null;
  embedded?: boolean;
  onRegisterPayment: (projectId: string, amount: number, paidAt: string, method: string) => Promise<boolean>;
}) {
  const [data, setData] = useState<ConstructionData>(emptyConstruction);
  const [selectedId, setSelectedId] = useState<string | null>(initialProjectId);
  const [tab, setTab] = useState<"diary" | "costs" | "payments" | "reports">("costs");
  const [newWorkOpen, setNewWorkOpen] = useState(false);
  const [workMenuId, setWorkMenuId] = useState<string | null>(null);
  const [coverProjectId, setCoverProjectId] = useState<string | null>(null);
  const [coverVersion, setCoverVersion] = useState(0);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const works = projects.filter((project) =>
    /obra|reforma|construção|execução/i.test(`${project.type} ${project.name}`),
  );

  async function loadConstruction() {
    const response = await fetch("/api/construction", { cache: "no-store" });
    if (response.ok) setData((await response.json()) as ConstructionData);
  }

  useEffect(() => {
    // Initial synchronization with the persistent construction records.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConstruction();
  }, []);

  async function submitConstruction(body: Record<string, unknown>) {
    const response = await fetch("/api/construction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      onAction("Não foi possível salvar esse lançamento.");
      return false;
    }
    await loadConstruction();
    onAction("Informação salva na obra.");
    return true;
  }

  async function submitDiary(
    projectId: string,
    payload: Record<string, unknown>,
    photos: File[],
  ) {
    let diaryResponse: Response;
    try {
      diaryResponse = await fetch("/api/construction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "diary", projectId, ...payload }),
      });
    } catch {
      onAction("Não foi possível publicar esse registro.");
      return false;
    }

    if (!diaryResponse.ok) {
      onAction("Não foi possível publicar esse registro.");
      return false;
    }

    const result = (await diaryResponse.json().catch(() => ({}))) as { diaryId?: string };
    if (!result.diaryId) {
      onAction("O registro foi recebido, mas não retornou um identificador válido.");
      await loadConstruction();
      return true;
    }

    if (photos.length > 0) {
      const photoPayload = new FormData();
      photoPayload.append("projectId", projectId);
      photoPayload.append("diaryId", result.diaryId);
      photos.forEach((photo) => photoPayload.append("photos", photo, photo.name));

      try {
        const photoResponse = await fetch("/api/construction/diary-photos", {
          method: "POST",
          body: photoPayload,
        });
        if (!photoResponse.ok) {
          await loadConstruction();
          onAction("Registro publicado, mas as imagens não puderam ser anexadas.");
          return true;
        }
      } catch {
        await loadConstruction();
        onAction("Registro publicado, mas as imagens não puderam ser anexadas.");
        return true;
      }
    }

    await loadConstruction();
    onAction(photos.length ? `Registro publicado com ${photos.length} imagem(ns).` : "Registro publicado no diário.");
    return true;
  }

  async function deleteWork(project: Project) {
    setWorkMenuId(null);
    if (!window.confirm(`Excluir a obra "${project.name}" e todos os seus custos e diários?`)) return;
    const ok = await submitConstruction({ action: "delete-work", projectId: project.id });
    if (!ok) return;
    if (selectedId === project.id) setSelectedId(null);
    await onProjectsChanged();
    onAction("Obra excluída.");
  }

  async function uploadWorkCover(file: File) {
    if (!coverProjectId) return;
    const form = new FormData();
    form.append("projectId", coverProjectId);
    form.append("cover", file, file.name);
    const response = await fetch("/api/construction/cover", { method: "POST", body: form });
    if (!response.ok) {
      onAction("Não foi possível salvar a foto de capa.");
      return;
    }
    setCoverVersion((current) => current + 1);
    setCoverProjectId(null);
    setWorkMenuId(null);
    onAction("Foto de capa atualizada.");
  }

  if (!selectedId) {
    return (
      <div className="content-wrap">
        <input
          ref={coverInputRef}
          className="visually-hidden work-cover-input"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadWorkCover(file);
            event.currentTarget.value = "";
          }}
        />
        <div className="works-heading">
          <div>
            <h2>Suas obras</h2>
            <p>Abra uma obra para acompanhar orçamento, prazo e registros do canteiro.</p>
          </div>
          <button className="primary-button" type="button" onClick={() => setNewWorkOpen(true)}>
            ＋ Criar obra
          </button>
        </div>
        <div className="work-card-grid">
          {works.map((project) => {
            const settings = data.settings.find((item) => item.project_id === project.id);
            const costs = data.costs.filter((item) => item.project_id === project.id);
            const spent = costs.reduce((sum, item) => sum + item.amount, 0);
            const budget = settings?.budget ?? 0;
            const contractValue = settings?.contract_value || project.price;
            const budgetUse = budget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
            const profit = contractValue - spent;
            return (
              <article
                className={`work-card-shell ${project.status === "done" ? "is-completed" : ""}`}
                key={project.id}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setWorkMenuId(project.id);
                }}
              >
                <button className="work-card" type="button" onClick={() => setSelectedId(project.id)}>
                  <div className="work-card-cover">
                    <img
                      key={`${project.id}-${coverVersion}`}
                      className="work-cover-image"
                      src={`/api/construction/cover?projectId=${encodeURIComponent(project.id)}&v=${coverVersion}`}
                      alt=""
                      onLoad={(event) => { event.currentTarget.dataset.loaded = "true"; }}
                      onError={(event) => { event.currentTarget.style.display = "none"; }}
                    />
                    <span className={project.status === "done" ? "work-status-completed" : "work-status-progress"}>
                      {project.status === "done" ? "Concluída" : "Em execução"}
                    </span>
                    <strong>{budgetUse}%</strong>
                  </div>
                  <div className="work-card-body">
                    <h3>{project.name}</h3>
                    <p>{project.client || "Cliente não informado"}</p>
                    <div className="work-card-values">
                      <span><small>Gasto</small>{money(spent)}</span>
                      <span className={profit < 0 ? "profit-negative" : "profit-positive"}>
                        <small>{profit < 0 ? "Prejuízo" : "Lucro"}</small>
                        {contractValue ? money(profit) : "Definir contrato"}
                      </span>
                    </div>
                    <div className="work-budget-track"><span style={{ width: `${budget ? Math.min(100, (spent / budget) * 100) : 0}%` }} /></div>
                  </div>
                </button>
                <button
                  className="work-card-menu-button"
                  type="button"
                  aria-label={`Opções da obra ${project.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setWorkMenuId((current) => current === project.id ? null : project.id);
                  }}
                >
                  <MoreHorizontal size={18} />
                </button>
                {workMenuId === project.id && (
                  <div className="work-card-menu">
                    <button type="button" onClick={() => { setSelectedId(project.id); setWorkMenuId(null); }}>Abrir obra</button>
                    <button type="button" onClick={() => {
                      setCoverProjectId(project.id);
                      window.setTimeout(() => coverInputRef.current?.click(), 0);
                    }}><Camera size={15} /> Enviar foto de capa</button>
                    <button className="danger-menu-item" type="button" onClick={() => void deleteWork(project)}>
                      <Trash2 size={15} /> Excluir obra
                    </button>
                  </div>
                )}
              </article>
            );
          })}
          {!works.length && (
            <div className="empty-state">
              <strong>Nenhuma obra cadastrada</strong>
              <p>Crie a primeira obra para começar a controlar custos e diário.</p>
              <button className="primary-button" type="button" onClick={() => setNewWorkOpen(true)}>Criar primeira obra</button>
            </div>
          )}
        </div>
        {newWorkOpen && (
          <NewWorkModal
            onClose={() => setNewWorkOpen(false)}
            onCreated={async () => {
              setNewWorkOpen(false);
              await Promise.all([onProjectsChanged(), loadConstruction()]);
              onAction("Obra criada e pronta para receber lançamentos.");
            }}
          />
        )}
      </div>
    );
  }

  const project = projects.find((item) => item.id === selectedId);
  if (!project) return null;
  const settings = data.settings.find((item) => item.project_id === project.id);
  const costs = data.costs.filter((item) => item.project_id === project.id).sort((a, b) => b.spent_at.localeCompare(a.spent_at));
  const diary = data.diary.filter((item) => item.project_id === project.id).sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  const diaryPhotos = (data.diaryPhotos ?? []).filter((item) => item.project_id === project.id);
  const spent = costs.reduce((sum, item) => sum + item.amount, 0);
  const budget = settings?.budget ?? 0;
  const contractValue = settings?.contract_value || project.price;
  const currentProfit = contractValue - spent;
  const paidCosts = costs.filter((item) => item.payment_status !== "Pendente").reduce((sum, item) => sum + item.amount, 0);
  const pendingCosts = Math.max(0, spent - paidCosts);
  const startDate = settings?.start_date || project.startDate;
  const plannedEnd = settings?.planned_end || project.dueDate;

  async function saveWorkField(
    field: "name" | "contractValue" | "budget" | "startDate" | "plannedEnd",
    value: string,
  ) {
    const nextContractValue = field === "contractValue"
      ? Math.max(0, Math.round(Number(value.replace(",", ".")) * 100))
      : contractValue;
    const nextBudget = field === "budget"
      ? Math.max(0, Math.round(Number(value.replace(",", ".")) * 100))
      : budget;
    const ok = await submitConstruction({
      action: "settings",
      projectId: project.id,
      name: field === "name" ? value.trim() : project.name,
      contractValue: nextContractValue,
      budget: nextBudget,
      startDate: field === "startDate" ? value : startDate,
      plannedEnd: field === "plannedEnd" ? value : plannedEnd,
    });
    if (ok) await onProjectsChanged();
    return ok;
  }

  return (
    <div className={`content-wrap work-dashboard ${embedded ? "is-embedded" : ""}`}>
      {!embedded && <button className="back-button" type="button" onClick={() => setSelectedId(null)}>← Voltar para obras</button>}
      <div className="work-dashboard-header">
        <div className="work-identity">
          <span className="section-kicker">{project.status === "done" ? "Obra concluída" : "Dashboard da obra"}</span>
          <EditableWorkField
            label="Título da obra"
            value={project.name}
            displayValue={project.name}
            variant="title"
            onSave={(value) => saveWorkField("name", value)}
          />
          <p>{project.client || "Cliente não informado"}</p>
          <div className="work-inline-facts">
            <EditableWorkField
              label="Valor contratado"
              value={String(contractValue / 100)}
              displayValue={contractValue ? money(contractValue) : "Definir valor"}
              type="number"
              onSave={(value) => saveWorkField("contractValue", value)}
            />
            <EditableWorkField
              label="Orçamento de custo"
              value={String(budget / 100)}
              displayValue={budget ? money(budget) : "Definir orçamento"}
              type="number"
              onSave={(value) => saveWorkField("budget", value)}
            />
            <EditableWorkField
              label="Início da obra"
              value={startDate}
              displayValue={startDate ? shortDate(startDate) : "Definir data"}
              type="date"
              onSave={(value) => saveWorkField("startDate", value)}
            />
            <EditableWorkField
              label="Término previsto"
              value={plannedEnd}
              displayValue={plannedEnd ? shortDate(plannedEnd) : "Definir data"}
              type="date"
              onSave={(value) => saveWorkField("plannedEnd", value)}
            />
          </div>
        </div>
        <div className="work-header-actions">
          {project.status !== "done" ? (
            <button
              className="complete-work-button"
              type="button"
              onClick={async () => {
                if (!window.confirm("Confirmar que esta obra foi concluída? O lucro será enviado ao Financeiro.")) return;
                const ok = await submitConstruction({ action: "complete-work", projectId: project.id });
                if (!ok) return;
                await onProjectsChanged();
                onAction("Obra concluída. O lucro já aparece no Financeiro.");
              }}
            >
              <CheckCircle2 size={17} /> Concluir obra
            </button>
          ) : (
            <button
              className="completed-work-badge"
              type="button"
              onClick={async () => {
                if (!window.confirm("Reabrir esta obra e marcá-la novamente como em andamento?")) return;
                const ok = await submitConstruction({ action: "reopen-work", projectId: project.id });
                if (!ok) return;
                await onProjectsChanged();
                onAction("Obra reaberta e marcada como em andamento.");
              }}
            >
              <CheckCircle2 size={16} /> Concluída · clique para reabrir
            </button>
          )}
        </div>
      </div>

      <div className="work-finance-strip">
        <article><span>Custo acumulado</span><strong>{money(spent)}</strong><small>{costs.length} lançamento(s)</small></article>
        <article><span>Saldo do orçamento</span><strong>{budget ? money(budget - spent) : "—"}</strong><small>{budget ? `${Math.round((spent / budget) * 100)}% utilizado` : "Orçamento não definido"}</small></article>
        <article><span>Compromissos a pagar</span><strong>{money(pendingCosts)}</strong><small>{pendingCosts ? "Existem despesas pendentes" : "Tudo quitado"}</small></article>
        <article><span>Resultado projetado</span><strong className={currentProfit < 0 ? "profit-negative" : "profit-positive"}>{contractValue ? money(currentProfit) : "—"}</strong><small>{contractValue ? `Contrato de ${money(contractValue)}` : "Valor não definido"}</small></article>
      </div>

      <div className="work-module-layout">
        <aside className="work-module-nav" aria-label="Módulos da obra">
          <div className="work-module-nav-heading"><span>Gestão da obra</span><strong>Escolha uma área</strong></div>
          <button className={tab === "costs" ? "active" : ""} onClick={() => setTab("costs")} type="button">
            <span><ReceiptText size={18} /></span><div><strong>Orçamento</strong><small>Tabela de custos e despesas</small></div>
          </button>
          <button className={tab === "diary" ? "active" : ""} onClick={() => setTab("diary")} type="button">
            <span><FileText size={18} /></span><div><strong>Diário de obra</strong><small>Timeline de registros</small></div>
          </button>
          <button className={tab === "payments" ? "active" : ""} onClick={() => setTab("payments")} type="button">
            <span><HandCoins size={18} /></span><div><strong>Pagamentos</strong><small>Recebimentos da obra</small></div>
          </button>
          <button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")} type="button">
            <span><BarChart3 size={18} /></span><div><strong>Relatórios</strong><small>Gráficos e análises</small></div>
          </button>
          <div className="work-module-mini-summary">
            <span>Visão rápida</span>
            <div><small>Orçamento</small><strong>{budget ? money(budget) : "Não definido"}</strong></div>
            <div><small>Diários publicados</small><strong>{diary.length}</strong></div>
          </div>
        </aside>

        <div className="work-module-content">
          {tab === "costs" && (
            <CostTab
              costs={costs}
              spent={spent}
              budget={budget}
              contractValue={contractValue}
              onSubmit={(payload) => submitConstruction({ action: "cost", projectId: project.id, ...payload })}
              onUpdate={(costId, payload) => submitConstruction({ action: "update-cost", projectId: project.id, costId, ...payload })}
              onDelete={(costId) => submitConstruction({ action: "delete-cost", projectId: project.id, costId })}
            />
          )}
          {tab === "diary" && (
            <DiaryTab
              key={project.id}
              project={project}
              diary={diary}
              diaryPhotos={diaryPhotos}
              onSubmit={(payload, photos) => submitDiary(project.id, payload, photos)}
            />
          )}
          {tab === "payments" && (
            <ConstructionPaymentsTab project={project} onRegister={onRegisterPayment} />
          )}
          {tab === "reports" && (
            <ConstructionReportsTab costs={costs} budget={budget} contractValue={contractValue} />
          )}
        </div>
      </div>
    </div>
  );
}

function ConstructionPaymentsTab({
  project,
  onRegister,
}: {
  project: Project;
  onRegister: (projectId: string, amount: number, paidAt: string, method: string) => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);
  const debt = Math.max(project.price - project.paidValue, 0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Math.round(Number(form.get("amount") || 0) * 100);
    if (amount <= 0) return;
    setSaving(true);
    const ok = await onRegister(project.id, amount, String(form.get("paidAt") || officeDateISO()), String(form.get("method") || "Pix"));
    setSaving(false);
    if (ok) event.currentTarget.reset();
  }
  return (
    <section className="panel work-section construction-payments">
      <header><div><span className="section-kicker">Recebimentos da obra</span><h2>Pagamentos</h2><p>Os lançamentos atualizam automaticamente o Financeiro, Contas a receber e o Kanban.</p></div></header>
      <div className="construction-payment-summary">
        <article><span>Valor contratado</span><strong>{money(project.price)}</strong></article>
        <article><span>Total recebido</span><strong>{money(project.paidValue)}</strong></article>
        <article><span>Falta receber</span><strong>{money(debt)}</strong></article>
      </div>
      <form className="construction-payment-form" onSubmit={submit}>
        <label><span>Data</span><input name="paidAt" type="date" defaultValue={officeDateISO()} required /></label>
        <label><span>Valor recebido</span><input name="amount" type="number" min="0.01" step="0.01" placeholder="R$ 0,00" required /></label>
        <label><span>Método</span><select name="method" defaultValue="Pix"><option>Pix</option><option>Transferência</option><option>Boleto</option><option>Dinheiro</option><option>Cartão</option><option>Outro</option></select></label>
        <button className="primary-button" type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar pagamento"}</button>
      </form>
      <div className="construction-payment-list">
        {project.payments.map((payment) => <div key={payment.id}><span>{shortDate(payment.paidAt)}</span><span>{payment.method || "Pix"}</span><strong>{money(payment.amount)}</strong></div>)}
        {!project.payments.length && <p className="empty-copy">Nenhum pagamento registrado nesta obra.</p>}
      </div>
    </section>
  );
}

function NewWorkModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/construction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-work",
          name: String(form.get("name") || ""),
          client: String(form.get("client") || ""),
          contractValue: Math.round(Number(form.get("contractValue") || 0) * 100),
          budget: Math.round(Number(form.get("budget") || 0) * 100),
          startDate: String(form.get("startDate") || ""),
          plannedEnd: String(form.get("plannedEnd") || ""),
        }),
      });
      if (!response.ok) throw new Error("Falha");
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="new-work-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><h2 id="new-work-title">Criar obra</h2><p>Cadastre somente o essencial. Custos e diário serão preenchidos dentro da obra.</p></div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field full"><label>Nome da obra</label><input name="name" required autoFocus placeholder="Ex.: Reforma da sede administrativa" /></div>
            <div className="field"><label>Cliente <small>opcional</small></label><input name="client" placeholder="Nome do cliente" /></div>
            <div className="field"><label>Valor contratado</label><input name="contractValue" required type="number" min="0.01" step="0.01" placeholder="0,00" /></div>
            <div className="field"><label>Orçamento de custo <small>opcional</small></label><input name="budget" type="number" min="0" step="0.01" placeholder="0,00" /></div>
            <div className="field"><label>Data de início</label><input name="startDate" type="date" /></div>
            <div className="field"><label>Término previsto</label><input name="plannedEnd" type="date" /></div>
          </div>
          <div className="form-actions">
            <button className="ghost-button" type="button" onClick={onClose}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Criando…" : "Criar obra"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditableWorkField({
  label,
  value,
  displayValue,
  type = "text",
  variant = "fact",
  onSave,
}: {
  label: string;
  value: string;
  displayValue: string;
  type?: "text" | "number" | "date";
  variant?: "title" | "fact";
  onSave: (value: string) => Promise<boolean | void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ignoreBlur = useRef(false);

  async function save() {
    if (ignoreBlur.current) {
      ignoreBlur.current = false;
      return;
    }
    const normalized = draft.trim();
    if (!normalized || normalized === value) {
      setEditing(false);
      setDraft(value);
      return;
    }
    const saved = await onSave(normalized);
    if (saved !== false) setEditing(false);
  }

  if (editing) {
    return (
      <label className={`editable-work-field editing ${variant}`}>
        <span>{label}</span>
        <div className="editable-work-input">
          {type === "number" && <b aria-hidden="true">R$</b>}
          <input
            autoFocus
            type={type}
            min={type === "number" ? "0.01" : undefined}
            step={type === "number" ? "0.01" : undefined}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void save()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                ignoreBlur.current = true;
                setDraft(value);
                setEditing(false);
              }
            }}
          />
        </div>
      </label>
    );
  }

  return (
    <button className={`editable-work-field ${variant}`} type="button" onClick={() => { setDraft(value); setEditing(true); }}>
      <span>{label}</span>
      <strong>{displayValue}</strong>
    </button>
  );
}

function CostTab({
  costs,
  spent,
  budget,
  contractValue,
  onSubmit,
  onUpdate,
  onDelete,
}: {
  costs: ConstructionData["costs"];
  spent: number;
  budget: number;
  contractValue: number;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean | void>;
  onUpdate: (costId: string, payload: Record<string, unknown>) => Promise<boolean | void>;
  onDelete: (costId: string) => Promise<boolean | void>;
}) {
  const emptyDraft = {
    category: "Materiais",
    description: "",
    amount: "",
    spentAt: officeDateISO(),
    supplier: "",
    payer: "",
    paymentStatus: "Pago",
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [formOpen, setFormOpen] = useState(false);
  const [listCategory, setListCategory] = useState("Todas");
  const paid = costs
    .filter((item) => item.payment_status === "Pago")
    .reduce((sum, item) => sum + item.amount, 0);
  const pending = Math.max(0, spent - paid);
  const currentProfit = contractValue - spent;
  const profitMargin = contractValue ? (currentProfit / contractValue) * 100 : 0;
  const selectedCategory = costCategories.find((item) => item.name === draft.category) ?? costCategories[0];
  const visibleCosts = listCategory === "Todas" ? costs : costs.filter((item) => item.category === listCategory);
  const visibleTotal = visibleCosts.reduce((sum, item) => sum + item.amount, 0);
  const payerSuggestions = Array.from(new Set(costs.map((item) => item.payer?.trim()).filter((payer): payer is string => Boolean(payer)))).sort((a, b) => a.localeCompare(b, "pt-BR"));

  function resetDraft(close = true) {
    setEditingId(null);
    setDraft({ ...emptyDraft, spentAt: officeDateISO() });
    if (close) setFormOpen(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      category: draft.category,
      description: draft.description,
      amount: Math.round(Number(draft.amount || 0) * 100),
      spentAt: draft.spentAt,
      supplier: draft.supplier,
      payer: draft.payer,
      paymentStatus: draft.paymentStatus,
    };
    const saved = editingId ? await onUpdate(editingId, payload) : await onSubmit(payload);
    if (saved !== false) resetDraft();
  }

  return (
    <section className="budget-workspace">
      <header className="budget-header">
        <div>
          <span className="section-kicker">Controle financeiro da execução</span>
          <h2>Orçamento da obra</h2>
        </div>
        <button className="primary-button budget-add-button" type="button" onClick={() => { resetDraft(false); setFormOpen(true); }}><Plus size={17} /> Novo lançamento</button>
      </header>

      <div className="budget-summary-row">
        <article><span>Valor contratado</span><strong>{contractValue ? money(contractValue) : "Não definido"}</strong><small>Receita prevista da obra</small></article>
        <article><span>Orçamento de custo</span><strong>{budget ? money(budget) : "Não definido"}</strong><small>Limite planejado para gastar</small></article>
        <article><span>Custo realizado</span><strong>{money(spent)}</strong><small>{costs.length} lançamento(s) · {money(pending)} pendente</small></article>
        <article><span>Lucro atual</span><strong className={currentProfit < 0 ? "profit-negative" : "profit-positive"}>{contractValue ? money(currentProfit) : "—"}</strong><small>{contractValue ? `${profitMargin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% de margem` : "Defina o valor contratado"}</small></article>
      </div>

      <div className="budget-filter-bar" aria-label="Filtrar tabela por categoria">
        <button className={listCategory === "Todas" ? "active" : ""} type="button" onClick={() => setListCategory("Todas")}><span className="budget-filter-dot all" /> Todas <small>{costs.length}</small></button>
        {costCategories.map((category) => (
          <button className={`category-${category.key} ${listCategory === category.name ? "active" : ""}`} type="button" key={category.name} onClick={() => setListCategory(category.name)}>
            <span className="budget-filter-dot" /> {category.name} <small>{costs.filter((item) => item.category === category.name).length}</small>
          </button>
        ))}
      </div>

      <div className="budget-table-shell">
        <table className="budget-table">
          <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th>Fornecedor</th><th>Pago por</th><th>Situação</th><th>Valor</th><th><span className="sr-only">Ações</span></th></tr></thead>
          <tbody>
            {visibleCosts.map((item) => {
              const category = costCategories.find((entry) => entry.name === item.category) ?? costCategories[costCategories.length - 1];
              const Icon = category.icon;
              return (
                <tr key={item.id}>
                  <td data-label="Data"><span className="budget-date">{shortDate(item.spent_at)}</span></td>
                  <td data-label="Categoria"><span className={`budget-category-tag category-${category.key}`}><Icon size={13} /> {item.category}</span></td>
                  <td data-label="Descrição"><div className="budget-description"><strong>{item.description}</strong><small>Registrado no orçamento</small></div></td>
                  <td data-label="Fornecedor"><span className="budget-supplier">{item.supplier || "Não informado"}</span></td>
                  <td data-label="Pago por"><span className="budget-payer">{item.payer || "Não informado"}</span></td>
                  <td data-label="Situação"><span className={`budget-status-tag ${item.payment_status === "Pago" ? "paid" : "pending"}`}><i /> {item.payment_status}</span></td>
                  <td data-label="Valor"><strong className="budget-value">{money(item.amount)}</strong></td>
                  <td className="budget-row-actions">
                    <button type="button" aria-label={`Editar ${item.description}`} onClick={() => {
                      setEditingId(item.id);
                      setDraft({ category: item.category, description: item.description, amount: String(item.amount / 100), spentAt: item.spent_at, supplier: item.supplier || "", payer: item.payer || "", paymentStatus: item.payment_status || "Pago" });
                      setFormOpen(true);
                    }}><Pencil size={14} /></button>
                    <button className="danger" type="button" aria-label={`Excluir ${item.description}`} onClick={async () => {
                      if (!window.confirm(`Excluir o custo "${item.description}"?`)) return;
                      const deleted = await onDelete(item.id);
                      if (deleted !== false && editingId === item.id) resetDraft();
                    }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              );
            })}
            {!visibleCosts.length && <tr><td className="budget-empty-row" colSpan={8}><ClipboardList size={23} /><strong>Nenhum item nesta categoria</strong><span>Adicione um lançamento ou selecione outro filtro.</span></td></tr>}
          </tbody>
          <tfoot><tr><td colSpan={6}><span>{listCategory === "Todas" ? "Total geral da obra" : `Subtotal · ${listCategory}`}</span><small>{visibleCosts.length} lançamento(s)</small></td><td><strong>{money(visibleTotal)}</strong></td><td /></tr></tfoot>
        </table>
      </div>

      {formOpen && (
        <div className="budget-dialog-backdrop" role="presentation" onMouseDown={() => resetDraft()}>
          <form className="budget-dialog" role="dialog" aria-modal="true" aria-labelledby="budget-dialog-title" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <span className={`budget-dialog-icon category-${selectedCategory.key}`}><selectedCategory.icon size={19} /></span>
              <div><h3 id="budget-dialog-title">{editingId ? "Editar lançamento" : "Novo lançamento"}</h3><p>Preencha somente os dados necessários para o orçamento.</p></div>
              <button className="close-button" type="button" onClick={() => resetDraft()} aria-label="Fechar">×</button>
            </header>
            <fieldset className="budget-dialog-categories">
              <legend>Categoria</legend>
              <div>{costCategories.map((category) => { const Icon = category.icon; return <button className={`category-${category.key}`} type="button" key={category.name} aria-pressed={draft.category === category.name} onClick={() => setDraft((current) => ({ ...current, category: category.name }))}><Icon size={15} /><span>{category.name}</span></button>; })}</div>
            </fieldset>
            <div className="budget-dialog-grid">
              <div className="field full"><label>Descrição do item</label><input required autoFocus value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Ex.: Concreto usinado 30 MPa" /></div>
              <div className="field"><label>Valor</label><div className="money-input"><span>R$</span><input required type="number" step="0.01" min="0.01" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="0,00" /></div></div>
              <div className="field"><label>Data da despesa</label><input required type="date" value={draft.spentAt} onChange={(event) => setDraft((current) => ({ ...current, spentAt: event.target.value }))} /></div>
              <div className="field"><label>Fornecedor <small>opcional</small></label><input value={draft.supplier} onChange={(event) => setDraft((current) => ({ ...current, supplier: event.target.value }))} placeholder="Empresa ou profissional" /></div>
              <div className="field"><label>Pago por <small>opcional</small></label><input list="construction-payers" value={draft.payer} onChange={(event) => setDraft((current) => ({ ...current, payer: event.target.value }))} placeholder="Ex.: Eduardo" /><datalist id="construction-payers">{payerSuggestions.map((payer) => <option key={payer} value={payer} />)}</datalist></div>
              <div className="field"><label>Situação do pagamento</label><select value={draft.paymentStatus} onChange={(event) => setDraft((current) => ({ ...current, paymentStatus: event.target.value }))}><option>Pago</option><option>Pendente</option></select></div>
            </div>
            <footer><button className="ghost-button" type="button" onClick={() => resetDraft()}>Cancelar</button><button className="primary-button" type="submit">{editingId ? "Salvar alteração" : "Adicionar ao orçamento"}</button></footer>
          </form>
        </div>
      )}
    </section>
  );
}

function ConstructionReportsTab({
  costs,
  budget,
  contractValue,
}: {
  costs: ConstructionData["costs"];
  budget: number;
  contractValue: number;
}) {
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const overallSpent = costs.reduce((sum, item) => sum + item.amount, 0);
  const activeCosts = categoryFilter === "Todas"
    ? costs
    : costs.filter((item) => item.category === categoryFilter);
  const filteredSpent = activeCosts.reduce((sum, item) => sum + item.amount, 0);
  const paid = activeCosts.filter((item) => item.payment_status === "Pago").reduce((sum, item) => sum + item.amount, 0);
  const pending = Math.max(0, filteredSpent - paid);
  const projectedProfit = contractValue - overallSpent;
  const budgetBalance = budget - overallSpent;
  const categoryTotals = Object.entries(costs.reduce<Record<string, number>>((map, item) => {
    map[item.category] = (map[item.category] ?? 0) + item.amount;
    return map;
  }, {})).sort((a, b) => b[1] - a[1]);
  const categorySummary = costCategories.map((category) => ({
    ...category,
    total: costs.filter((item) => item.category === category.name).reduce((sum, item) => sum + item.amount, 0),
    count: costs.filter((item) => item.category === category.name).length,
  }));
  const monthTotals = Object.entries(activeCosts.reduce<Record<string, number>>((map, item) => {
    const month = item.spent_at.slice(0, 7);
    if (month) map[month] = (map[month] ?? 0) + item.amount;
    return map;
  }, {})).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  const supplierTotals = Object.entries(activeCosts.reduce<Record<string, number>>((map, item) => {
    const supplier = item.supplier.trim() || "Sem fornecedor informado";
    map[supplier] = (map[supplier] ?? 0) + item.amount;
    return map;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const payerTotals = Object.values(activeCosts
    .filter((item) => item.payment_status === "Pago")
    .reduce<Record<string, { label: string; total: number; count: number }>>((map, item) => {
      const label = item.payer?.trim() || "Não informado";
      const key = label.toLocaleLowerCase("pt-BR");
      map[key] ??= { label, total: 0, count: 0 };
      map[key].total += item.amount;
      map[key].count += 1;
      return map;
    }, {}))
    .sort((a, b) => b.total - a.total);
  const payerPaidTotal = payerTotals.reduce((sum, item) => sum + item.total, 0);
  const maxCategory = Math.max(1, ...categoryTotals.map((item) => item[1]));
  const maxMonth = Math.max(1, ...monthTotals.map((item) => item[1]));
  const highestMonth = monthTotals.slice().sort((a, b) => b[1] - a[1])[0];
  const highestItem = activeCosts.slice().sort((a, b) => b.amount - a.amount)[0];
  const filteredShare = overallSpent ? Math.round((filteredSpent / overallSpent) * 100) : 0;
  const budgetUsage = budget ? Math.min(100, Math.round((overallSpent / budget) * 100)) : 0;
  const paidShare = overallSpent ? Math.round((costs.filter((item) => item.payment_status === "Pago").reduce((sum, item) => sum + item.amount, 0) / overallSpent) * 100) : 0;
  return (
    <section className="panel work-section cost-workspace construction-report-workspace">
      <div className="panel-head cost-section-head">
        <div>
          <h2>Relatórios da obra</h2>
          <p className="panel-sub">Compare categorias, acompanhe a evolução dos gastos e consulte cada lançamento.</p>
        </div>
        <span className="report-live-badge"><BarChart3 size={15} /> Dados atualizados automaticamente</span>
      </div>

      <section className="report-filter-panel" aria-label="Filtrar relatório por categoria">
        <div className="report-filter-heading">
          <span><FileText size={16} /></span>
          <div><strong>Visualizar por categoria</strong><small>Os gráficos e as listas abaixo acompanham o filtro selecionado.</small></div>
        </div>
        <div className="report-category-filter">
          <button
            type="button"
            className={categoryFilter === "Todas" ? "active" : ""}
            onClick={() => setCategoryFilter("Todas")}
          >
            <span>Todas</span><strong>{money(overallSpent)}</strong><small>{costs.length} itens</small>
          </button>
          {categorySummary.map((category) => {
            const Icon = category.icon;
            return (
              <button
                type="button"
                key={category.name}
                className={`category-${category.key} ${categoryFilter === category.name ? "active" : ""}`}
                onClick={() => setCategoryFilter(category.name)}
              >
                <span><Icon size={14} /> {category.name}</span>
                <strong>{money(category.total)}</strong>
                <small>{category.count} item(ns)</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className="report-visual-summary">
        <article className="report-donut-card">
          <div className="report-waffle" role="img" aria-label={budget ? `${budgetUsage}% do orçamento utilizado` : "Orçamento não definido"}>
            {Array.from({ length: 25 }, (_, index) => (
              <i key={index} className={budget && index < Math.round(budgetUsage / 4) ? "active" : ""} />
            ))}
            <span><strong>{budget ? `${budgetUsage}%` : "—"}</strong><small>utilizado</small></span>
          </div>
          <div><span>Consumo do orçamento</span><strong>{budget ? `${money(overallSpent)} de ${money(budget)}` : "Orçamento não definido"}</strong><small>{budget ? `${money(Math.abs(budgetBalance))} ${budgetBalance >= 0 ? "disponíveis" : "acima do limite"}` : "Defina o orçamento nos dados da obra"}</small></div>
        </article>
        <article className="report-payment-card">
          <div className="report-card-title"><span>Composição dos pagamentos</span><strong>{money(overallSpent)}</strong></div>
          <div className="report-payment-track"><span className="paid" style={{ width: `${paidShare}%` }} /><span className="pending" style={{ width: `${100 - paidShare}%` }} /></div>
          <div className="report-payment-legend">
            <span><i className="paid" /> Pago <strong>{paidShare}%</strong></span>
            <span><i className="pending" /> Pendente <strong>{100 - paidShare}%</strong></span>
          </div>
        </article>
        <article className="report-leading-category">
          <div className="report-card-title"><span>Categoria de maior impacto</span><strong>{categoryTotals[0]?.[0] ?? "Sem dados"}</strong></div>
          <strong>{categoryTotals[0] ? money(categoryTotals[0][1]) : money(0)}</strong>
          <small>{categoryTotals[0] && overallSpent ? `${Math.round((categoryTotals[0][1] / overallSpent) * 100)}% do custo total da obra` : "Aguardando lançamentos"}</small>
        </article>
      </div>

      <div className="cost-insight-grid report-kpi-grid">
        <article><span>Custo analisado</span><strong>{money(filteredSpent)}</strong><small>{categoryFilter === "Todas" ? "Todas as categorias" : categoryFilter}</small></article>
        <article><span>Participação no total</span><strong>{filteredShare}%</strong><small>Do custo geral de {money(overallSpent)}</small></article>
        <article><span>Valor pago</span><strong>{money(paid)}</strong><small>{activeCosts.filter((item) => item.payment_status === "Pago").length} item(ns) quitado(s)</small></article>
        <article><span>Valor pendente</span><strong>{money(pending)}</strong><small>{activeCosts.filter((item) => item.payment_status === "Pendente").length} pendência(s)</small></article>
      </div>

      <div className="report-highlight-grid compact">
        <article>
          <span className="report-highlight-icon"><ChartSpline size={18} /></span>
          <div><small>Mês de maior gasto</small><strong>{highestMonth ? new Date(`${highestMonth[0]}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "Sem dados"}</strong><span>{highestMonth ? money(highestMonth[1]) : "Faça o primeiro lançamento"}</span></div>
        </article>
        <article>
          <span className="report-highlight-icon"><CircleDollarSign size={18} /></span>
          <div><small>Item de maior custo</small><strong>{highestItem?.description ?? "Sem dados"}</strong><span>{highestItem ? `${highestItem.category} · ${money(highestItem.amount)}` : "Faça o primeiro lançamento"}</span></div>
        </article>
        <article>
          <span className="report-highlight-icon"><Scale size={18} /></span>
          <div><small>Resultado projetado da obra</small><strong className={projectedProfit < 0 ? "profit-negative" : "profit-positive"}>{contractValue ? money(projectedProfit) : "Contrato não definido"}</strong><span>{budget ? `${money(Math.abs(budgetBalance))} ${budgetBalance >= 0 ? "restantes no orçamento" : "acima do orçamento"}` : "Orçamento não definido"}</span></div>
        </article>
      </div>

      <div className="cost-analysis-grid">
        <section className="cost-analysis-card">
          <div className="cost-analysis-heading"><div><span>Comparativo geral</span><h3>Custo por categoria</h3></div><BarChart3 size={18} /></div>
          <div className="cost-bars">
            {categoryTotals.map(([category, value]) => (
              <button
                className={`cost-bar-row ${categoryFilter === category ? "active" : ""}`}
                type="button"
                key={category}
                onClick={() => setCategoryFilter(category)}
              >
                <div><span>{category}</span><strong>{money(value)}</strong></div>
                <div className="cost-bar-track"><span style={{ width: `${(value / maxCategory) * 100}%` }} /></div>
              </button>
            ))}
            {!categoryTotals.length && <p className="empty-copy">Sem dados para analisar.</p>}
          </div>
        </section>
        <section className="cost-analysis-card">
          <div className="cost-analysis-heading"><div><span>{categoryFilter === "Todas" ? "Todas as categorias" : categoryFilter}</span><h3>Evolução mensal</h3></div><ChartSpline size={18} /></div>
          <div className="cost-month-chart">
            {monthTotals.map(([month, value]) => (
              <div key={month}>
                <span className="cost-month-bar" style={{ height: `${Math.max(8, (value / maxMonth) * 100)}%` }} />
                <strong>{money(value, true)}</strong>
                <small>{new Date(`${month}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "short" })}</small>
              </div>
            ))}
            {!monthTotals.length && <p className="empty-copy">Sem dados para analisar.</p>}
          </div>
        </section>
      </div>

      <div className="report-detail-grid">
        <section className="cost-analysis-card report-expense-card">
          <div className="cost-analysis-heading">
            <div><span>Lista detalhada</span><h3>Despesas · {categoryFilter}</h3></div>
            <strong>{activeCosts.length} item(ns)</strong>
          </div>
          <div className="report-expense-list">
            {activeCosts.slice().sort((a, b) => b.spent_at.localeCompare(a.spent_at)).map((item) => {
              const category = costCategories.find((entry) => entry.name === item.category) ?? costCategories[costCategories.length - 1];
              const Icon = category.icon;
              return (
                <div className={`report-expense-row category-${category.key}`} key={item.id}>
                  <span className="report-expense-icon"><Icon size={15} /></span>
                  <div><strong>{item.description}</strong><small>{item.category}{item.supplier ? ` · ${item.supplier}` : ""}{item.payment_status === "Pago" ? ` · Pago por ${item.payer || "não informado"}` : ""}</small></div>
                  <span>{shortDate(item.spent_at)}</span>
                  <span className={`cost-status ${item.payment_status === "Pago" ? "paid" : "pending"}`}>{item.payment_status}</span>
                  <strong>{money(item.amount)}</strong>
                </div>
              );
            })}
            {!activeCosts.length && <p className="empty-copy">Nenhuma despesa nesta categoria.</p>}
          </div>
          <footer><span>Total da seleção</span><strong>{money(filteredSpent)}</strong></footer>
        </section>
        <section className="cost-analysis-card">
          <div className="cost-analysis-heading"><div><span>Origem do gasto</span><h3>Fornecedores</h3></div></div>
          <div className="cost-ranking-list">
            {supplierTotals.map(([supplier, value], index) => (
              <div key={supplier}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{supplier}</strong><small>{activeCosts.filter((item) => (item.supplier.trim() || "Sem fornecedor informado") === supplier).length} lançamento(s)</small></div><strong>{money(value)}</strong></div>
            ))}
            {!supplierTotals.length && <p className="empty-copy">Sem dados para analisar.</p>}
          </div>
        </section>
        <section className="cost-analysis-card payer-analysis-card">
          <div className="cost-analysis-heading"><div><span>Responsável pelo desembolso</span><h3>Pago por pessoa</h3></div><UsersRound size={18} /></div>
          <div className="cost-ranking-list">
            {payerTotals.map((payer, index) => (
              <div key={payer.label.toLocaleLowerCase("pt-BR")}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{payer.label}</strong><small>{payer.count} lançamento(s) · {payerPaidTotal ? Math.round((payer.total / payerPaidTotal) * 100) : 0}% do total pago</small></div><strong>{money(payer.total)}</strong></div>
            ))}
            {!payerTotals.length && <p className="empty-copy">Nenhuma despesa paga com pagador informado.</p>}
          </div>
        </section>
      </div>
    </section>
  );
}

const diaryPhotoLimit = 6;
const diaryPhotoMaxBytes = 8 * 1024 * 1024;

type PendingDiaryPhoto = {
  id: string;
  fingerprint: string;
  file: File;
  previewUrl: string;
};

function DiaryTab({
  project,
  diary,
  diaryPhotos,
  onSubmit,
}: {
  project: Project;
  diary: ConstructionData["diary"];
  diaryPhotos: NonNullable<ConstructionData["diaryPhotos"]>;
  onSubmit: (payload: Record<string, unknown>, photos: File[]) => Promise<boolean | void>;
}) {
  const [pendingPhotos, setPendingPhotos] = useState<PendingDiaryPhoto[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pendingPhotosRef = useRef<PendingDiaryPhoto[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  function replacePendingPhotos(next: PendingDiaryPhoto[]) {
    pendingPhotosRef.current = next;
    setPendingPhotos(next);
  }

  function clearPendingPhotos() {
    pendingPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    replacePendingPhotos([]);
    setPhotoError("");
  }

  useEffect(() => () => {
    pendingPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
  }, []);

  function addPhotos(fileList: FileList | null) {
    if (!fileList?.length) return;
    const current = pendingPhotosRef.current;
    const next = [...current];
    const fingerprints = new Set(current.map((photo) => photo.fingerprint));
    const rejected: string[] = [];

    for (const file of Array.from(fileList)) {
      if (next.length >= diaryPhotoLimit) {
        rejected.push(`O limite é de ${diaryPhotoLimit} imagens por registro.`);
        break;
      }
      const supportedType = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type.toLowerCase())
        || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
      if (!supportedType) {
        rejected.push(`${file.name}: formato não aceito.`);
        continue;
      }
      if (file.size > diaryPhotoMaxBytes) {
        rejected.push(`${file.name}: excede 8 MiB.`);
        continue;
      }
      const fingerprint = `${file.name}:${file.size}:${file.lastModified}`;
      if (fingerprints.has(fingerprint)) {
        rejected.push(`${file.name}: imagem já selecionada.`);
        continue;
      }
      fingerprints.add(fingerprint);
      next.push({
        id: `${file.lastModified}-${file.size}-${next.length}`,
        fingerprint,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    replacePendingPhotos(next);
    setPhotoError(Array.from(new Set(rejected)).join(" "));
  }

  function removePhoto(id: string) {
    const removed = pendingPhotosRef.current.find((photo) => photo.id === id);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    replacePendingPhotos(pendingPhotosRef.current.filter((photo) => photo.id !== id));
    setPhotoError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSubmitting(true);
    setPhotoError("");
    try {
      const saved = await onSubmit({
        entryDate: String(form.get("entryDate") || ""),
        summary: String(form.get("summary") || ""),
        teamSize: Number(form.get("teamSize") || 0),
        weather: String(form.get("weather") || ""),
        occurrences: String(form.get("occurrences") || ""),
      }, pendingPhotosRef.current.map((photo) => photo.file));
      if (saved !== false) {
        formElement.reset();
        clearPendingPhotos();
      }
    } catch {
      setPhotoError("Não foi possível publicar o registro. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function printDiary() {
    document.body.classList.add("print-construction-diary");
    const clear = () => {
      document.body.classList.remove("print-construction-diary");
      window.removeEventListener("afterprint", clear);
    };
    window.addEventListener("afterprint", clear);
    window.print();
  }

  const latestEntry = diary[0];

  return (
    <section className="panel work-section diary-workspace">
      <div className="panel-head diary-section-head">
        <div><h2>Diário de obra</h2><p className="panel-sub">Registre o dia de trabalho e mantenha o histórico da obra organizado.</p></div>
        <button className="ghost-button diary-print-button" type="button" onClick={printDiary}><Printer size={16} /> Imprimir relatório</button>
      </div>

      <form className="diary-composer" onSubmit={submit}>
        <div className="diary-composer-heading">
          <span><ClipboardList size={19} /></span>
          <div><strong>Novo registro diário</strong><small>Preencha somente o que aconteceu hoje no canteiro.</small></div>
        </div>
        <div className="diary-composer-body">
          <div className="diary-text-fields">
            <label htmlFor="diary-services">
              <span>Serviços executados</span>
              <small>Descreva as atividades concluídas ou em andamento.</small>
              <textarea id="diary-services" name="summary" required placeholder="Ex.: Concretagem da laje do pavimento térreo concluída…" />
            </label>
            <label htmlFor="diary-occurrences">
              <span>Ocorrências e observações <small>opcional</small></span>
              <small>Registre imprevistos, decisões, entregas ou orientações.</small>
              <textarea id="diary-occurrences" name="occurrences" placeholder="Ex.: Entrega de blocos recebida às 10h30…" />
            </label>
          </div>
          <div className="diary-composer-controls">
            <label><span><FileText size={14} /> Data do registro</span><input name="entryDate" required type="date" defaultValue={officeDateISO()} /></label>
            <label><span><UsersRound size={14} /> Pessoas na equipe</span><input name="teamSize" type="number" min="0" placeholder="0" /></label>
            <label><span><CloudSun size={14} /> Condição do tempo</span><select name="weather"><option>Ensolarado</option><option>Nublado</option><option>Chuvoso</option><option>Parcialmente nublado</option></select></label>
          </div>
          <fieldset
            className="diary-entry-block diary-photo-picker"
            style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
            aria-describedby={`diary-photo-help-${project.id} diary-photo-status-${project.id}`}
          >
            <legend style={{ padding: 0 }}><strong>Imagens do registro</strong></legend>
            <p id={`diary-photo-help-${project.id}`}>
              Adicione até {diaryPhotoLimit} fotos JPG, PNG, WebP, HEIC ou HEIF, com no máximo 8 MiB cada.
            </p>
            <div className="diary-composer-footer diary-photo-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
              <button
                className="ghost-button"
                type="button"
                disabled={submitting || pendingPhotos.length >= diaryPhotoLimit}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera size={16} /> Abrir câmera
              </button>
              <input
                ref={cameraInputRef}
                hidden
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => {
                  addPhotos(event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
              />
              <button
                className="ghost-button"
                type="button"
                disabled={submitting || pendingPhotos.length >= diaryPhotoLimit}
                onClick={() => galleryInputRef.current?.click()}
              >
                <Images size={16} /> Escolher da galeria
              </button>
              <input
                ref={galleryInputRef}
                hidden
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  addPhotos(event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
              />
            </div>
            {pendingPhotos.length > 0 && (
              <ul
                className="diary-photo-preview-grid"
                aria-label="Prévias das imagens selecionadas"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                  gap: 10,
                  listStyle: "none",
                  margin: "14px 0 0",
                  padding: 0,
                }}
              >
                {pendingPhotos.map((photo, index) => (
                  <li
                    className="diary-photo-preview"
                    key={photo.id}
                    style={{
                      position: "relative",
                      minWidth: 0,
                      padding: 6,
                      border: "1px solid #E8E7E4",
                      borderRadius: 8,
                      background: "#FFFFFF",
                    }}
                  >
                    <img
                      src={photo.previewUrl}
                      alt={`Prévia ${index + 1}: ${photo.file.name}`}
                      style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 4 }}
                    />
                    <button
                      className="icon-button diary-photo-remove"
                      type="button"
                      aria-label={`Remover ${photo.file.name}`}
                      title="Remover imagem"
                      onClick={() => removePhoto(photo.id)}
                      style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, minWidth: 32 }}
                    >
                      <X size={15} />
                    </button>
                    <small title={photo.file.name} style={{ display: "block", marginTop: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {photo.file.name}
                    </small>
                  </li>
                ))}
              </ul>
            )}
            <p
              className="diary-photo-status"
              id={`diary-photo-status-${project.id}`}
              role={photoError ? "alert" : "status"}
              aria-live="polite"
            >
              {photoError || `${pendingPhotos.length} de ${diaryPhotoLimit} imagens selecionadas.`}
            </p>
          </fieldset>
          <div className="diary-composer-footer">
            <span>O registro e suas imagens serão adicionados à linha do tempo e ao relatório para impressão.</span>
            <button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Publicando…" : "Adicionar ao diário"}</button>
          </div>
        </div>
      </form>

      <div className="diary-social-layout">
      <div className="diary-print-sheet">
        <header className="diary-print-header">
          <div><img src="/preforte-logo-2026-128.png" alt="Preforte" /><span><strong>Preforte</strong><small>Engenharia e Construtora</small></span></div>
          <div><strong>Diário de obra</strong><span>{project.name}</span><small>Emitido em {new Date().toLocaleDateString("pt-BR")}</small></div>
        </header>
        <div className="diary-report-summary">
          <span><small>Obra</small><strong>{project.name}</strong></span>
          <span><small>Cliente</small><strong>{project.client || "Não informado"}</strong></span>
          <span><small>Registros</small><strong>{diary.length}</strong></span>
        </div>
        <div className="diary-timeline-heading">
          <div><span>Linha do tempo</span><strong>Histórico diário da obra</strong></div>
          <div><span>{diary.length} registro(s)</span><small>{latestEntry ? `Última atualização em ${shortDate(latestEntry.entry_date)}` : "Nenhuma atualização"}</small></div>
        </div>
        {diary.map((item) => {
          const itemPhotos = diaryPhotos.filter((photo) => photo.diary_id === item.id);
          return (
            <article className="diary-entry" key={item.id}>
              <div className="diary-entry-rail">
                <div className="diary-date-badge">
                  <strong>{new Date(`${item.entry_date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit" })}</strong>
                  <span>{new Date(`${item.entry_date}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
                </div>
                <span />
              </div>
              <div className="diary-entry-content">
                <header>
                  <div>
                    <span>Registro de campo</span>
                    <strong>{new Date(`${item.entry_date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</strong>
                  </div>
                  <time>{item.created_at ? `Publicado às ${new Date(item.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}</time>
                </header>
                <div className="diary-entry-tags">
                  <span><CloudSun size={14} /> {item.weather || "Tempo não informado"}</span>
                  <span><UsersRound size={14} /> {item.team_size} pessoa(s)</span>
                  {itemPhotos.length > 0 && <span><Images size={14} /> {itemPhotos.length} foto(s)</span>}
                </div>
                <div className="diary-entry-block"><small>Serviços executados</small><p>{item.summary}</p></div>
                {item.occurrences && <div className="diary-entry-block occurrence"><small>Ocorrências e observações</small><p>{item.occurrences}</p></div>}
                {itemPhotos.length > 0 && (
                  <div className="diary-entry-block diary-entry-photos" style={{ breakInside: "avoid" }}>
                    <small>Imagens do registro</small>
                    <div
                      className="diary-entry-photo-grid"
                      aria-label={`Imagens do registro de ${shortDate(item.entry_date)}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {itemPhotos.map((photo, index) => (
                        <a
                          className="diary-entry-photo"
                          key={photo.id}
                          href={photo.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Abrir foto ${index + 1}: ${photo.filename}`}
                          title={photo.filename}
                          style={{ display: "block", minWidth: 0, breakInside: "avoid" }}
                        >
                          <img
                            src={photo.url}
                            alt={`Foto ${index + 1} do registro de ${shortDate(item.entry_date)}`}
                            style={{
                              display: "block",
                              width: "100%",
                              height: "clamp(110px, 18vw, 180px)",
                              objectFit: "cover",
                              borderRadius: 4,
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {!diary.length && <div className="diary-empty"><span>◎</span><strong>Nenhum registro ainda</strong><p>Publique o primeiro diário para iniciar a linha do tempo da obra.</p></div>}
      </div>
      <aside className="diary-feed-aside">
        <div className="diary-aside-profile">
          <span><img src="/preforte-logo-2026-128.png" alt="" /></span>
          <div><strong>{project.name}</strong><small>Diário oficial da obra</small></div>
        </div>
        <div className="diary-aside-stats">
          <div><span>Publicações</span><strong>{diary.length}</strong></div>
          <div><span>Último registro</span><strong>{latestEntry ? shortDate(latestEntry.entry_date) : "—"}</strong></div>
          <div><span>Equipe no último dia</span><strong>{latestEntry ? `${latestEntry.team_size} pessoa(s)` : "—"}</strong></div>
        </div>
        <div className="diary-a4-card">
          <FileText size={20} />
          <div><strong>Relatório A4</strong><span>O feed é convertido automaticamente em um documento branco e organizado.</span></div>
          <button type="button" onClick={printDiary}><Printer size={14} /> Gerar para impressão</button>
        </div>
      </aside>
      </div>
    </section>
  );
}

function SettingsPage({
  initialUser,
  onAction,
}: {
  initialUser?: WorkspaceUser;
  onAction: (message: string) => void;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);

  async function loadMembers() {
    const response = await fetch("/api/team", { cache: "no-store" });
    if (response.ok) setMembers((await response.json()) as TeamMember[]);
  }

  useEffect(() => {
    // Load pending access requests registered in this workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMembers();
  }, []);

  async function removeMember(id: string) {
    const response = await fetch(`/api/team?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      onAction("Não foi possível remover esse convite.");
      return;
    }
    await loadMembers();
    onAction("Convite removido da lista.");
  }

  return (
    <div className="content-wrap settings-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Espaço de trabalho</h2><p className="panel-sub">Informações do escritório</p></div></div>
        <div className="mini-list">
          <div className="mini-row"><div><strong>Preforte Engenharia e Construtora</strong><span>Gestão do escritório</span></div><span className="tag good">Ativo</span></div>
          <div className="mini-row"><div><strong>Dados na nuvem</strong><span>Projetos sincronizados</span></div><span className="tag good">Conectado</span></div>
          <div className="mini-row"><div><strong>OneDrive</strong><span>Pastas dos projetos em EDUARDO</span></div><a className="tag good" href="/onedrive">Configurar</a></div>
          <div className="mini-row"><div><strong>Paperclip</strong><span>Escritório dos agentes (só leitura)</span></div><a className="tag good" href="/paperclip">Configurar</a></div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Equipe</h2><p className="panel-sub">Solicitações de acesso ao workspace privado</p></div><button className="primary-button" type="button" onClick={() => setInviteOpen(true)}>＋ Convidar</button></div>
        <div className="access-note">
          <strong>Como funciona o acesso</strong>
          <p>O cadastro abaixo prepara a solicitação. A autorização privada é concluída no acesso do site pelo ChatGPT e exige uma conta ativa no mesmo workspace.</p>
        </div>
        <div className="mini-list">
          <div className="mini-row"><div><strong>{initialUser?.displayName || "Você"}</strong><span>{initialUser?.email || "Administrador do workspace"}</span></div><span className="tag good">Administrador</span></div>
          {members.map((member) => (
            <div className="mini-row member-row" key={member.id}>
              <div><strong>{member.name || member.email}</strong><span>{member.email} · {member.role}</span></div>
              <div className="member-actions"><span className="tag pending">Pendente</span><button type="button" onClick={() => removeMember(member.id)}>Remover</button></div>
            </div>
          ))}
          {!members.length && <p className="empty-copy">Nenhum convite pendente.</p>}
        </div>
      </section>
      {inviteOpen && (
        <InviteMemberModal
          onClose={() => setInviteOpen(false)}
          onCreated={async () => {
            setInviteOpen(false);
            await loadMembers();
            onAction("Solicitação de acesso registrada.");
          }}
        />
      )}
    </div>
  );
}

function InviteMemberModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") || ""),
          email: String(form.get("email") || ""),
          role: String(form.get("role") || "Projetos e obras"),
        }),
      });
      if (!response.ok) throw new Error("Falha");
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal compact-modal invite-modal" role="dialog" aria-modal="true" aria-labelledby="invite-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><h2 id="invite-title">Convidar para a Preforte</h2><p>Registre a conta do ChatGPT que deverá receber acesso ao workspace.</p></div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field full"><label>Nome</label><input name="name" required autoFocus placeholder="Nome do colaborador" /></div>
            <div className="field full"><label>E-mail da conta ChatGPT</label><input name="email" type="email" required placeholder="colaborador@empresa.com" /></div>
            <div className="field full"><label>Perfil</label><select name="role"><option>Projetos e obras</option><option>Somente projetos</option><option>Financeiro</option></select></div>
          </div>
          <div className="invite-disclaimer">O convite ficará pendente até a conta ser autorizada no acesso privado deste site.</div>
          <div className="form-actions">
            <button className="ghost-button" type="button" onClick={onClose}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving}>{saving ? "Registrando…" : "Registrar convite"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewProjectModal({
  serviceTypes,
  onClose,
  onCreated,
}: {
  serviceTypes: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState("");
  const [pasta, setPasta] = useState("");
  const [cliente, setCliente] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tipo.trim()) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      client: cliente,
      type: tipo,
      address: String(form.get("address") || ""),
      startDate: String(form.get("startDate") || ""),
      dueDate: String(form.get("dueDate") || ""),
      price: Math.round(Number(form.get("price") || 0) * 100),
      pasta,
    };
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Falha");
      onCreated();
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><h2 id="new-project-title">Criar projeto</h2><p>Comece com o essencial. Os demais dados ficam dentro do projeto.</p></div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field full"><label htmlFor="project-name">Nome do projeto</label><input id="project-name" name="name" required placeholder="Ex.: Projeto de incêndio — Galpão Sul" autoFocus /></div>
            <div className="field full">
              <label>Tipo de serviço</label>
              <ServiceTypePicker value={tipo} onChange={setTipo} existentes={serviceTypes} />
              {!tipo && <span className="field-help">Escolha uma tag ou escreva outro tipo.</span>}
            </div>
            <div className="field"><label htmlFor="project-client">Cliente</label><input id="project-client" name="client" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente (nome da pasta)" /></div>
            <div className="field"><label htmlFor="price">Valor contratado</label><input id="price" name="price" type="number" min="0" step="0.01" required placeholder="0,00" /></div>
            <div className="field full">
              <label>Pasta no OneDrive</label>
              <FolderPicker value={pasta} tipo={tipo} cliente={cliente} onChange={setPasta} />
            </div>
            <div className="field full"><label htmlFor="project-address">Endereço <small>opcional</small></label><input id="project-address" name="address" placeholder="Rua, bairro e cidade" /></div>
            <div className="field"><label htmlFor="start-date">Data de início <small>opcional</small></label><input id="start-date" name="startDate" type="date" /></div>
            <div className="field"><label htmlFor="due-date">Previsão de término <small>opcional</small></label><input id="due-date" name="dueDate" type="date" /></div>
          </div>
          <div className="form-actions">
            <button className="ghost-button" type="button" onClick={onClose}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={saving || !tipo.trim()}>{saving ? "Criando…" : "Criar projeto"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SimplifiedProjectDrawer({
  project,
  onClose,
  onDelete,
  onUpdatePrice,
  onUpdatePriority,
  onAddTask,
  onTask,
  onPayment,
  onDeletePayment,
  onUpdateNotes,
  columns,
  onMove,
}: {
  project: Project;
  onClose: () => void;
  onDelete: () => void;
  onUpdatePrice: (price: number) => void;
  onUpdatePriority: (priority: Priority) => void;
  onAddTask: (title: string) => void;
  onTask: (taskId: string, done: boolean) => void;
  onPayment: (amount: number, paidAt: string) => void;
  onDeletePayment: (paymentId: string) => void;
  onUpdateNotes: (notes: string) => void;
  columns: BoardColumn[];
  onMove: (status: Status) => void;
}) {
  const [payment, setPayment] = useState("");
  const [paymentDate, setPaymentDate] = useState(officeDateISO());
  const [newTask, setNewTask] = useState("");
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState((project.price / 100).toFixed(2));
  const [notes, setNotes] = useState(project.notes || "");
  const progress = projectProgress(project);
  const debt = Math.max(project.price - project.paidValue, 0);
  const elapsedDays = projectElapsedDays(project);

  function savePrice() {
    const price = Math.max(0, Math.round(Number(priceInput.replace(",", ".")) * 100));
    if (Number.isFinite(price) && price !== project.price) onUpdatePrice(price);
    setEditingPrice(false);
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Detalhes de ${project.name}`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><span className="drawer-type">{project.type}</span><h2>{project.name}</h2><p>{project.client || "Cliente não informado"}</p></div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="drawer-grid">
          <div className="drawer-main">
            <div className="detail-metrics detail-metrics-with-time simplified-metrics">
              <div className="detail-metric detail-price"><span>Valor</span>{editingPrice ? <input autoFocus value={priceInput} inputMode="decimal" onChange={(event) => setPriceInput(event.target.value)} onBlur={savePrice} onKeyDown={(event) => { if (event.key === "Enter") savePrice(); if (event.key === "Escape") setEditingPrice(false); }} aria-label="Valor do projeto" /> : <button type="button" onClick={() => { setPriceInput((project.price / 100).toFixed(2)); setEditingPrice(true); }} aria-label="Editar valor do projeto"><strong>{money(project.price)}</strong></button>}</div>
              <div className="detail-metric"><span>Recebido</span><strong>{money(project.paidValue)}</strong></div>
              <div className="detail-metric"><span>Saldo</span><strong>{money(debt)}</strong></div>
              <div className="detail-metric"><span>Progresso</span><strong>{progress}%</strong></div>
              <div className="detail-metric"><span>Tempo de projeto</span><strong>{elapsedDays} {elapsedDays === 1 ? "dia" : "dias"}</strong></div>
            </div>
            <h3 className="section-title">Tarefas</h3>
            <div className="checklist-progress"><span style={{ width: `${progress}%` }} /></div>
            <div className="detail-checklist task-system">
              {project.tasks.map((task) => (
                <SimpleTaskRow
                  key={task.id}
                  task={task}
                  onTask={onTask}
                />
              ))}
              {!project.tasks.length && <p className="empty-copy">Nenhuma tarefa cadastrada.</p>}
            </div>
            <form className="add-checklist-form simple-add-task" onSubmit={(event) => { event.preventDefault(); if (newTask.trim()) { onAddTask(newTask.trim()); setNewTask(""); } }}>
              <input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="Adicionar tarefa..." aria-label="Nova tarefa" />
              <button className="secondary-button" type="submit">Adicionar tarefa</button>
            </form>
            <h3 className="section-title">Observações</h3>
            <div className="project-notes-box">
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Digite informações, lembretes ou observações sobre este projeto..." rows={5} />
              <button className="secondary-button" type="button" onClick={() => onUpdateNotes(notes)}>Salvar observações</button>
            </div>
            <h3 className="section-title">Arquivos no OneDrive</h3>
            <ProjectFiles projectId={project.id} />
            <h3 className="section-title">Pagamentos</h3>
            <div className="payment-box project-payment-box">
              <label><span>Data do pagamento</span><input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} aria-label="Data do pagamento" /></label>
              <label><span>Valor recebido</span><input type="number" min="0" step="0.01" value={payment} onChange={(event) => setPayment(event.target.value)} placeholder="R$ 0,00" aria-label="Valor recebido" /></label>
              <button className="primary-button" type="button" onClick={() => { const amount = Math.round(Number(payment || 0) * 100); if (amount > 0 && paymentDate) { onPayment(amount, paymentDate); setPayment(""); } }}>Registrar pagamento</button>
            </div>
            <div className="payment-history">
              {project.payments.map((item) => (
                <div className="payment-row" key={item.id}>
                  <span>{shortDate(item.paidAt)}</span>
                  <div className="payment-row-actions">
                    <strong>{money(item.amount)}</strong>
                    <button
                      className="payment-delete-button"
                      type="button"
                      aria-label={`Excluir pagamento de ${money(item.amount)}`}
                      title="Excluir pagamento"
                      onClick={() => {
                        if (window.confirm("Excluir este pagamento? O valor recebido e o saldo do projeto serão recalculados.")) {
                          onDeletePayment(item.id);
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="drawer-side">
            {project.status !== "done" ? (
              <button className="secondary-button wide-button complete-button" type="button" onClick={() => onMove("done")}>✓ Marcar como concluído</button>
            ) : (
              <button className="secondary-button wide-button" type="button" onClick={() => onMove(columns[0]?.id ?? "backlog")}>↩ Reabrir projeto</button>
            )}
            <div className="attrs">
              <h4>Atributos</h4>
              <div className="attr"><span className="attr-label">Etapa</span><select className="attr-select" value={project.status} onChange={(e) => onMove(e.target.value as Status)}>{columns.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
              <div className="attr"><span className="attr-label">Prioridade</span><div className="attr-chips">{([["normal", "Normal"], ["high", "Alta"]] as const).map(([value, label]) => <button key={value} type="button" className={`chip ${value === "high" ? "chip-red" : ""} ${project.priority === value || (value === "high" && project.priority === "urgent") ? "active" : ""}`} onClick={() => onUpdatePriority(value)}>{label}</button>)}</div></div>
              <div className="attr"><span className="attr-label">Tipo</span><span className="service-tag" style={{ "--tag-color": corDoTipo(project.type) } as React.CSSProperties}>{project.type}</span></div>
              <div className="attr"><span className="attr-label">Cliente</span><span className="attr-value">{project.client || "—"}</span></div>
              <div className="attr"><span className="attr-label">Valor</span><span className="attr-value">{money(project.price)}</span></div>
              <div className="attr"><span className="attr-label">Prazo</span><span className="attr-value">{project.dueDate ? shortDate(project.dueDate) : "—"}</span></div>
              <div className="attr"><span className="attr-label">Endereço</span><span className="attr-value">{project.address || "—"}</span></div>
              <div className="attr"><span className="attr-label">Pasta</span><span className="attr-value attr-folder">{ICONE_PASTA[categoriaDoTipo(project.type).pasta]} {categoriaDoTipo(project.type).pasta}</span></div>
            </div>
            <button className="delete-button" type="button" onClick={onDelete}>Excluir projeto</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function SimpleTaskRow({ task, onTask }: { task: Task; onTask: (taskId: string, done: boolean) => void }) {
  return <div className={`detail-task task-detail-row ${task.done ? "done" : ""}`}><label><input className="task-check" type="checkbox" checked={task.done} onChange={(event) => onTask(task.id, event.target.checked)} /><span><strong>{task.title}</strong><small>{task.done ? "Concluída" : "Em andamento"}</small></span></label></div>;
}

/* Legacy drawer retained as migration reference only; it is excluded from the application bundle.
function ProjectDrawer({
  project,
  columns,
  serviceTypes,
  onClose,
  onMove,
  onDelete,
  onUpdate,
  onAddTask,
  onTask,
  onUpdateTaskTime,
  onPayment,
}: {
  project: Project;
  columns: BoardColumn[];
  serviceTypes: string[];
  onClose: () => void;
  onMove: (status: Status) => void;
  onDelete: () => void;
  onUpdate: (details: Record<string, unknown>) => void;
  onAddTask: (task: { title: string; parentId: string; estimatedMinutes: number }) => void;
  onTask: (taskId: string, done: boolean) => void;
  onUpdateTaskTime: (taskId: string, estimatedMinutes: number, trackedMinutes: number) => void;
  onPayment: (amount: number) => void;
}) {
  const [payment, setPayment] = useState("");
  const [newTask, setNewTask] = useState("");
  const [taskParent, setTaskParent] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [editing, setEditing] = useState(false);
  const progress = projectProgress(project);
  const debt = Math.max(project.price - project.paidValue, 0);
  const estimatedTotal = project.tasks.reduce((sum, task) => sum + Number(task.estimatedMinutes || 0), 0);
  const trackedTotal = project.tasks.reduce((sum, task) => sum + Number(task.trackedMinutes || 0), 0);
  const parentTasks = project.tasks.filter((task) => !task.parentId);

  function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onUpdate({
      client: String(form.get("client") || ""),
      type: String(form.get("type") || ""),
      address: String(form.get("address") || ""),
      startDate: String(form.get("startDate") || ""),
      dueDate: String(form.get("dueDate") || ""),
      areaM2: Number(form.get("areaM2") || 0),
      priority: String(form.get("priority") || "normal"),
      price: Math.max(0, Math.round(Number(form.get("price") || 0) * 100)),
    });
    setEditing(false);
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Detalhes de ${project.name}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div><span className="drawer-type">{project.type}</span><h2>{project.name}</h2><p>{project.client || "Cliente não informado"}</p></div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="drawer-grid">
          <div className="drawer-main">
            <div className="detail-metrics detail-metrics-with-time">
              <div className="detail-metric"><span>Valor</span><strong>{money(project.price)}</strong></div>
              <div className="detail-metric"><span>Recebido</span><strong>{money(project.paidValue)}</strong></div>
              <div className="detail-metric"><span>Saldo</span><strong>{money(debt)}</strong></div>
              <div className="detail-metric"><span>Progresso</span><strong>{progress}%</strong></div>
              <div className="detail-metric"><span>Tempo previsto</span><strong>{formatMinutes(estimatedTotal)}</strong></div>
              <div className="detail-metric"><span>Tempo usado</span><strong>{formatMinutes(trackedTotal)}</strong></div>
            </div>

            <h3 className="section-title">Tarefas e subtarefas</h3>
            <div className="checklist-progress"><span style={{ width: `${progress}%` }} /></div>
            <div className="detail-checklist task-system">
              {parentTasks.map((task) => (
                <div className="task-group" key={task.id}>
                  <DrawerTaskRow task={task} onTask={onTask} onUpdateTime={onUpdateTaskTime} />
                  {project.tasks.filter((child) => child.parentId === task.id).map((child) => (
                    <DrawerTaskRow key={child.id} task={child} subtask onTask={onTask} onUpdateTime={onUpdateTaskTime} />
                  ))}
                  <button className="add-subtask-button" type="button" onClick={() => setTaskParent(task.id)}>＋ Adicionar subtarefa</button>
                </div>
              ))}
              {!project.tasks.length && <p className="empty-copy">NENHUMA TAREFA CADASTRADA.</p>}
            </div>
            <form className="add-checklist-form" onSubmit={(event) => {
              event.preventDefault();
              if (newTask.trim()) {
                onAddTask({
                  title: newTask.trim(),
                  parentId: taskParent,
                  estimatedMinutes: Math.max(0, Math.round(Number(estimatedHours || 0) * 60)),
                });
                setNewTask("");
                setEstimatedHours("");
                setTaskParent("");
              }
            }}>
              <select value={taskParent} onChange={(event) => setTaskParent(event.target.value)} aria-label="Tipo da tarefa">
                <option value="">Tarefa principal</option>
                {parentTasks.map((task) => <option key={task.id} value={task.id}>Subtarefa de: {task.title}</option>)}
              </select>
              <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder={taskParent ? "Nome da subtarefa…" : "Nome da tarefa…"} aria-label="Nova tarefa" />
              <input className="task-estimate-input" type="number" min="0" step="0.25" value={estimatedHours} onChange={(event) => setEstimatedHours(event.target.value)} placeholder="Horas previstas" aria-label="Horas previstas" />
              <button className="secondary-button" type="submit">{taskParent ? "Adicionar subtarefa" : "Adicionar tarefa"}</button>
            </form>

            <h3 className="section-title">Pagamentos</h3>
            <div className="payment-box">
              <input type="number" min="0" step="0.01" value={payment} onChange={(e) => setPayment(e.target.value)} placeholder="Valor recebido" aria-label="Valor recebido" />
              <button className="primary-button" type="button" onClick={() => {
                const amount = Math.round(Number(payment || 0) * 100);
                if (amount > 0) {
                  onPayment(amount);
                  setPayment("");
                }
              }}>Registrar pagamento</button>
            </div>
            <div className="payment-history">
              {project.payments.map((item) => (
                <div className="payment-row" key={item.id}><span>{shortDate(item.paidAt)}</span><strong>{money(item.amount)}</strong></div>
              ))}
            </div>
          </div>

          <div className="drawer-side">
            <div className="drawer-control-card">
              <div className="field"><label>Etapa</label><select value={project.status} onChange={(e) => onMove(e.target.value as Status)}>{columns.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></div>
              <div className="field">
                <label>Prioridade</label>
                <div className="priority-picker">
                  {([
                    ["high", "Alta", "#E5322D"],
                    ["medium", "Média", "#E5322D"],
                    ["low", "Baixa", "#1A1A1A"],
                  ] as const).map(([value, label, color]) => (
                    <button
                      key={value}
                      type="button"
                      className={project.priority === value ? "active" : ""}
                      style={{ "--priority-color": color } as React.CSSProperties}
                      onClick={() =>
                        onUpdate({
                          client: project.client,
                          type: project.type,
                          address: project.address,
                          startDate: project.startDate,
                          dueDate: project.dueDate,
                          areaM2: project.areaM2,
                          priority: value,
                        })
                      }
                    >
                      <span />{label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button className="secondary-button wide-button" type="button" onClick={() => setEditing((value) => !value)}>✎ Editar informações</button>
            {editing && (
              <form className="drawer-edit-form" onSubmit={submitDetails}>
                <div className="field"><label>Cliente</label><input name="client" defaultValue={project.client} /></div>
                <div className="field"><label>Tipo de serviço</label><input name="type" list="drawer-service-types" defaultValue={project.type} /><datalist id="drawer-service-types">{serviceTypes.map((type) => <option key={type} value={type} />)}</datalist></div>
                <div className="field"><label>Valor do projeto</label><input name="price" type="number" min="0" step="0.01" defaultValue={(project.price / 100).toFixed(2)} /></div>
                <div className="field"><label>Prioridade</label><select name="priority" defaultValue={project.priority}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></div>
                <div className="field"><label>Metragem do projeto</label><input name="areaM2" type="number" min="0" step="0.01" defaultValue={project.areaM2 || ""} placeholder="m²" /></div>
                <div className="field"><label>Endereço</label><input name="address" defaultValue={project.address} /></div>
                <div className="field"><label>Início</label><input name="startDate" type="date" defaultValue={project.startDate} /></div>
                <div className="field"><label>Término previsto</label><input name="dueDate" type="date" defaultValue={project.dueDate} /></div>
                <button className="primary-button" type="submit">Salvar alterações</button>
              </form>
            )}
            {!editing && (
              <dl className="project-info-list">
                <div><dt>Prioridade</dt><dd>{project.priority === "urgent" || project.priority === "high" ? "Alta" : project.priority === "medium" ? "Média" : "Baixa"}</dd></div>
                <div><dt>Metragem</dt><dd>{project.areaM2 ? `${project.areaM2.toLocaleString("pt-BR")} m²` : "Não informada"}</dd></div>
                <div><dt>Prazo</dt><dd>{project.dueDate ? shortDate(project.dueDate) : "Não informado"}</dd></div>
                <div><dt>Endereço</dt><dd>{project.address || "Não informado"}</dd></div>
              </dl>
            )}
            <button className="delete-button" type="button" onClick={onDelete}>Excluir projeto</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function DrawerTaskRow({
  task,
  subtask = false,
  onTask,
  onUpdateTime,
}: {
  task: Task;
  subtask?: boolean;
  onTask: (taskId: string, done: boolean) => void;
  onUpdateTime: (taskId: string, estimatedMinutes: number, trackedMinutes: number) => void;
}) {
  const [estimated, setEstimated] = useState(String((Number(task.estimatedMinutes || 0) / 60) || ""));
  const [tracked, setTracked] = useState(String((Number(task.trackedMinutes || 0) / 60) || ""));

  function saveTime() {
    const estimatedValue = Math.max(0, Math.round(Number(estimated || 0) * 60));
    const trackedValue = Math.max(0, Math.round(Number(tracked || 0) * 60));
    if (estimatedValue !== Number(task.estimatedMinutes || 0) || trackedValue !== Number(task.trackedMinutes || 0)) {
      onUpdateTime(task.id, estimatedValue, trackedValue);
    }
  }

  return (
    <div className={`detail-task task-detail-row ${task.done ? "done" : ""} ${subtask ? "is-subtask" : ""}`}>
      <label>
        <input className="task-check" type="checkbox" checked={task.done} onChange={(event) => onTask(task.id, event.target.checked)} />
        <span><strong>{task.title}</strong><small>{subtask ? "Subtarefa" : "Tarefa"}</small></span>
      </label>
      <div className="task-time-inputs">
        <label><span>Previsto</span><input type="number" min="0" step="0.25" value={estimated} onChange={(event) => setEstimated(event.target.value)} onBlur={saveTime} aria-label={`Horas previstas de ${task.title}`} /></label>
        <label><span>Usado</span><input type="number" min="0" step="0.25" value={tracked} onChange={(event) => setTracked(event.target.value)} onBlur={saveTime} aria-label={`Horas usadas em ${task.title}`} /></label>
      </div>
    </div>
  );
}

*/
function DeleteConfirmation({
  project,
  onCancel,
  onConfirm,
}: {
  project: Project;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop confirm-layer" role="presentation" onMouseDown={onCancel}>
      <div className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="confirm-icon">!</div>
        <h2 id="delete-title">Excluir “{project.name}”?</h2>
        <p>O projeto, seus checklists, pagamentos e registros de obra serão removidos. Essa ação não pode ser desfeita.</p>
        <div className="form-actions">
          <button className="ghost-button" type="button" onClick={onCancel}>Cancelar</button>
          <button className="delete-confirm-button" type="button" onClick={onConfirm}>Excluir definitivamente</button>
        </div>
      </div>
    </div>
  );
}
