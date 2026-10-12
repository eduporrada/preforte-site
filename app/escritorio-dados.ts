/**
 * Estado do escritório dos agentes, lido do Paperclip (sem gastar crédito: só leitura).
 * Resultado em cache por alguns segundos para não martelar o Paperclip.
 */
import { api, lerConfig } from "./paperclip";

export type Sala = "presidencia" | "gerencia" | "desenhistas" | "redacao" | "analise" | "geral";

export type AgenteEstado = {
  id: string;
  nome: string;
  papel: string;
  titulo: string;
  sala: Sala;
  estado: "trabalhando" | "esperando_voce" | "parado" | "pausado";
  tarefa: { id: string; identificador: string; titulo: string } | null;
  ultimaAtividade: string | null;
};

export type Atividade = { quando: string; agenteId: string | null; agente: string; texto: string; tarefa: string | null };

export type Escritorio = {
  conectado: boolean;
  demo: boolean;
  empresa: string;
  atualizadoEm: string;
  agentes: AgenteEstado[];
  atividades: Atividade[];
  precisaDeVoce: number;
};

type PcAgente = { id: string; name: string; role: string; title: string | null; status: string; reportsTo: string | null; lastHeartbeatAt: string | null };
type PcIssue = { id: string; identifier: string; title: string; status: string; assigneeAgentId: string | null; executionRunId: string | null; updatedAt: string };
type PcAtividade = { id: string; actorType: string; agentId: string | null; action: string; entityType: string; entityId: string | null; createdAt: string; details?: Record<string, unknown> };

export function salaDoAgente(a: { name: string; role: string; title?: string | null; reportsTo: string | null }): Sala {
  const t = `${a.name} ${a.title ?? ""} ${a.role}`.toLowerCase();
  if (!a.reportsTo || t.includes("president") || t.includes("ceo")) return "presidencia";
  if (t.includes("gerente") || t.includes("manager")) return "gerencia";
  if (t.includes("desenh") || t.includes("projetista") || t.includes("engineer")) return "desenhistas";
  if (t.includes("redator") || t.includes("writer")) return "redacao";
  if (t.includes("analista") || t.includes("qa") || t.includes("review")) return "analise";
  return "geral";
}

const ACOES: Record<string, (d: Record<string, unknown>) => string> = {
  "issue.created": () => "criou a tarefa",
  "issue.updated": (d) => (d.status ? `mudou a tarefa para ${rotuloStatus(String(d.status))}` : "atualizou a tarefa"),
  "issue.comment_added": () => "comentou na tarefa",
  "issue.assigned": () => "repassou a tarefa",
  "issue.read_marked": () => "leu a tarefa",
  "heartbeat.started": () => "começou a trabalhar",
  "heartbeat.finished": () => "terminou o turno",
  "heartbeat.failed": () => "teve um erro no turno",
  "agent.run.started": () => "começou a trabalhar",
  "agent.run.completed": () => "terminou o turno",
  "environment.lease_acquired": () => "sentou para trabalhar",
  "environment.lease_released": () => "levantou da mesa",
  "approval.requested": () => "pediu sua aprovação",
  "approval.approved": () => "aprovou",
  "approval.rejected": () => "recusou",
  "agent.created": () => "foi contratado",
  "agent.updated": () => "teve o cadastro atualizado",
  "document.created": () => "escreveu um documento",
  "goal.created": () => "definiu uma meta",
  "project.created": () => "abriu um projeto",
};

function rotuloStatus(s: string) {
  return ({ backlog: "fila", todo: "a fazer", in_progress: "em andamento", in_review: "em revisão", blocked: "bloqueada", done: "concluída", cancelled: "cancelada" } as Record<string, string>)[s] ?? s;
}

function textoAcao(a: PcAtividade) {
  const f = ACOES[a.action];
  if (f) return f(a.details ?? {});
  const [ent, verbo] = a.action.split(".");
  return `${verbo?.replace(/_/g, " ") ?? a.action} (${ent})`;
}

let cache: { em: number; dados: Escritorio } | null = null;

export async function lerEscritorio(): Promise<Escritorio> {
  if (cache && Date.now() - cache.em < 8000) return cache.dados;
  const cfg = lerConfig();
  if (!cfg) return demo();
  try {
    const base = `/api/companies/${cfg.companyId}`;
    const [agentes, issues, atividades] = await Promise.all([
      api<PcAgente[]>(cfg.url, cfg.token, `${base}/agents`),
      api<PcIssue[]>(cfg.url, cfg.token, `${base}/issues?limit=200`),
      api<PcAtividade[]>(cfg.url, cfg.token, `${base}/activity?limit=40`),
    ]);
    const porAgente = new Map(agentes.map((a) => [a.id, a]));
    const issuePorId = new Map(issues.map((i) => [i.id, i]));
    const emAndamento = issues.filter((i) => ["in_progress", "in_review", "blocked", "todo"].includes(i.status));
    const precisaDeVoce = issues.filter((i) => i.status === "in_review" || i.status === "blocked").length;

    const lista: AgenteEstado[] = agentes
      .filter((a) => a.status !== "terminated")
      .map((a) => {
        const minhas = emAndamento.filter((i) => i.assigneeAgentId === a.id);
        const ativa = minhas.find((i) => i.executionRunId) ?? minhas.find((i) => i.status === "in_progress") ?? null;
        const trabalhando = a.status === "running" || a.status === "busy" || Boolean(ativa?.executionRunId);
        const bloqueada = minhas.find((i) => i.status === "blocked" || i.status === "in_review") ?? null;
        const estado: AgenteEstado["estado"] = a.status === "paused" ? "pausado" : trabalhando ? "trabalhando" : bloqueada ? "esperando_voce" : "parado";
        const t = ativa ?? bloqueada ?? minhas[0] ?? null;
        return {
          id: a.id,
          nome: a.name,
          papel: a.role,
          titulo: a.title ?? "",
          sala: salaDoAgente(a),
          estado,
          tarefa: t ? { id: t.id, identificador: t.identifier, titulo: t.title } : null,
          ultimaAtividade: a.lastHeartbeatAt,
        };
      });

    const feed: Atividade[] = atividades
      .filter((a) => a.actorType === "agent" || a.action.startsWith("approval") || a.action.startsWith("heartbeat"))
      .map((a) => {
        const ag = a.agentId ? porAgente.get(a.agentId) : null;
        const issue = a.entityType === "issue" && a.entityId ? issuePorId.get(a.entityId) : null;
        return { quando: a.createdAt, agenteId: a.agentId, agente: ag?.name ?? (a.actorType === "user" ? "Você" : "Sistema"), texto: textoAcao(a), tarefa: issue ? `${issue.identifier} · ${issue.title}` : null };
      })
      .slice(0, 30);

    const dados: Escritorio = { conectado: true, demo: false, empresa: cfg.companyName ?? "", atualizadoEm: new Date().toISOString(), agentes: lista, atividades: feed, precisaDeVoce };
    cache = { em: Date.now(), dados };
    return dados;
  } catch (e) {
    console.error("Escritório: falha ao ler o Paperclip", e);
    if (cache) return { ...cache.dados, atualizadoEm: new Date().toISOString() };
    return { ...demo(), conectado: true, empresa: cfg.companyName ?? "" };
  }
}

/** Modo demonstração: a equipe de verdade, com estados inventados, até o Paperclip ser conectado. */
function demo(): Escritorio {
  const agora = new Date();
  const h = (m: number) => new Date(agora.getTime() - m * 60000).toISOString();
  const agentes: AgenteEstado[] = [
    { id: "d1", nome: "Presidente", papel: "general", titulo: "Gerente do escritório", sala: "presidencia", estado: "trabalhando", tarefa: { id: "t1", identificador: "PRE-7", titulo: "Distribuir desmembramento do Sr. Adalberto" }, ultimaAtividade: h(2) },
    { id: "d2", nome: "Projetista PPCI", papel: "engineer", titulo: "Projetista de Segurança Contra Incêndio", sala: "desenhistas", estado: "trabalhando", tarefa: { id: "t2", identificador: "PRE-8", titulo: "Planta de PPCI — Supermercado Ribeiro" }, ultimaAtividade: h(5) },
    { id: "d3", nome: "Redator", papel: "writer", titulo: "Redator de memoriais e requerimentos", sala: "redacao", estado: "parado", tarefa: null, ultimaAtividade: h(40) },
    { id: "d4", nome: "Analista de Projetos", papel: "qa", titulo: "Engenheiro Revisor de Projetos", sala: "analise", estado: "esperando_voce", tarefa: { id: "t3", identificador: "PRE-6", titulo: "Revisão estrutural — Galpão Orion" }, ultimaAtividade: h(12) },
    { id: "d5", nome: "Analista CBMGO", papel: "qa", titulo: "Analista de Segurança Contra Incêndio", sala: "analise", estado: "parado", tarefa: null, ultimaAtividade: h(90) },
  ];
  const atividades: Atividade[] = [
    { quando: h(1), agenteId: "d1", agente: "Presidente", texto: "comentou na tarefa", tarefa: "PRE-7 · Distribuir desmembramento do Sr. Adalberto" },
    { quando: h(4), agenteId: "d2", agente: "Projetista PPCI", texto: "começou a trabalhar", tarefa: "PRE-8 · Planta de PPCI — Supermercado Ribeiro" },
    { quando: h(12), agenteId: "d4", agente: "Analista de Projetos", texto: "pediu sua aprovação", tarefa: "PRE-6 · Revisão estrutural — Galpão Orion" },
    { quando: h(38), agenteId: "d3", agente: "Redator", texto: "terminou o turno", tarefa: "PRE-5 · Memorial descritivo — Lote 12" },
  ];
  return { conectado: false, demo: true, empresa: "Preforte Engenharia", atualizadoEm: agora.toISOString(), agentes, atividades, precisaDeVoce: 1 };
}
